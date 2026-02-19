#!/usr/bin/env npx tsx
/**
 * Daily Content Generator — Hetzner Cron Script
 *
 * Generates one day's Instagram content (images, videos, captions),
 * uploads media to Spellcast, and schedules posts.
 *
 * Designed to run as a cron job on Hetzner:
 *   0 3 * * * cd /path/to/artify && npx tsx scripts/daily-generate.ts
 *
 * Options:
 *   --date YYYY-MM-DD   Target date (default: tomorrow)
 *   --week               Generate a full week (Mon–Sun) starting from --date or next Monday
 *   --dry-run            Generate content but don't upload to Spellcast
 *   --no-validate        Skip hand/finger validation
 *   --no-video           Skip video rendering (faster for testing)
 */

import * as fs from "fs";
import * as path from "path";
import {
  buildDayPlan,
  ENGAGEMENT_STORY_CONFIG,
  generateImage,
  getBaseForPalette,
  getBaseForContext,
  generateCaption,
  generateCarouselCaption,
  generateStoryText,
  generatePlatformVariants,
  SpellcastClient,
} from "../src/lib/pipeline";
import type { DayPlan, ScheduledPost, PlatformCaptions } from "../src/lib/pipeline";
import { buildScenePrompt } from "../src/lib/scenes";
import { buildCarouselSlides } from "./carousel-types";
import { renderTextSlide, renderTextOverlay, type TemplateType, type TextSlideOptions } from "./text-slide-renderer";
import { pickFromBank, saveToBank, tagsFromSceneKey } from "./image-bank";
import { renderReel } from "./render-reel";
import { generateLivingIllustration, isFalAvailable } from "./fal-video";

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------

function loadEnvLocal() {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OUTPUT_DIR = "public/content";

// Post schedule times (UTC) — spread throughout the day for engagement
const SCHEDULE_TIMES: Record<string, string[]> = {
  feed: ["12:00", "18:00"],       // noon + 6pm UTC
  story: ["09:00", "11:00", "15:00", "20:00"], // morning, midday, afternoon, evening
  reel: ["17:00"],                // 5pm UTC
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Slide {
  type: "hook_image" | "text_card";
  image: string | null;
  video?: string | null;
  textContent?: { heading: string; body: string[]; footer?: string };
}

interface ContentPost {
  sceneKey: string;
  label: string;
  slot: "feed" | "story" | "reel";
  image: string | null;
  video: string | null;
  caption: string | null;
  captions?: PlatformCaptions;
  format: string;
  slides: Slide[];
  contentType?: string;
  dataRef?: string;
  storyFormat?: string;
  engagementCta?: string;
  storyAnimated?: boolean;
  spellcastPostId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      if (["dry-run", "no-validate", "no-video", "week"].includes(key)) {
        flags[key] = "true";
      } else if (i + 1 < args.length) {
        flags[key] = args[i + 1];
        i++;
      }
    }
  }
  return flags;
}

function getTomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get next Monday (or this Monday if today is Monday) */
function getNextMonday(from?: Date): Date {
  const d = from ? new Date(from) : new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon
  const daysUntilMon = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setDate(d.getDate() + daysUntilMon);
  return d;
}

/** Get the scheduled time for a post slot */
function getScheduleTime(date: Date, slot: "feed" | "story" | "reel", index: number): string {
  const times = SCHEDULE_TIMES[slot];
  const time = times[index % times.length];
  const [hours, minutes] = time.split(":");
  const d = new Date(date);
  d.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Main generation flow
// ---------------------------------------------------------------------------

async function generateDay(
  targetDate: Date,
  opts: { dryRun: boolean; validate: boolean; renderVideo: boolean },
) {
  const dateStr = formatDate(targetDate);
  const dayDir = path.join(OUTPUT_DIR, dateStr);
  fs.mkdirSync(dayDir, { recursive: true });

  console.log();
  console.log("=".repeat(60));
  console.log(`DAILY CONTENT GENERATOR — ${dateStr}`);
  console.log("=".repeat(60));

  // 1. Build day plan
  const plan = buildDayPlan(targetDate);
  console.log(`\n${plan.astro.dayName} ${dateStr}`);
  console.log(`  ${plan.astro.moon.emoji} ${plan.astro.moon.name} (${plan.astro.moon.illumination}%)`);
  console.log(`  ${plan.astro.zodiac.symbol} ${plan.astro.zodiac.sign} season`);
  if (plan.astro.sabbat) console.log(`  SABBAT: ${plan.astro.sabbat.name}`);
  console.log(`  Posts planned: ${plan.posts.length}`);

  // 2. Initialize Spellcast client (if not dry run)
  let spellcast: SpellcastClient | null = null;
  if (!opts.dryRun) {
    try {
      spellcast = new SpellcastClient();
      console.log(`\n  Spellcast: connected to ${process.env.SPELLCAST_API_URL}`);
    } catch (err) {
      console.error(`\n  Spellcast: ${err}`);
      console.log("  Falling back to dry-run mode");
      opts.dryRun = true;
    }
  }

  // Integration IDs for each platform (Postiz)
  const INTEGRATIONS = {
    instagram: process.env.POSTIZ_INTEGRATION_INSTAGRAM ?? "cmlqxasl60005qm6e96pi1eo4",
    threads: process.env.POSTIZ_INTEGRATION_THREADS ?? "cmlqxc0rf0009qm6eogwk2paw",
    facebook: process.env.POSTIZ_INTEGRATION_FACEBOOK ?? "cmlqxdoct000hqm6exzx3dzu1",
  };

  // 3. Process each post
  const results: ContentPost[] = [];
  const usedCarouselKeys: Record<string, string[]> = {};

  // Count slots for schedule time assignment
  const slotCounters = { feed: 0, story: 0, reel: 0 };

  let stats = { images: 0, textSlides: 0, videos: 0, captions: 0, uploaded: 0, scheduled: 0, failed: 0 };

  for (let i = 0; i < plan.posts.length; i++) {
    const p = plan.posts[i];
    const postNum = String(i + 1).padStart(2, "0");
    const result: ContentPost = {
      sceneKey: p.sceneKey,
      label: p.scene.label,
      slot: p.slot,
      image: null,
      video: null,
      caption: null,
      format: p.format,
      slides: [],
      contentType: p.contentType,
      storyFormat: p.storyFormat,
      engagementCta: p.engagementCta,
      storyAnimated: p.storyAnimated,
    };

    console.log(`\n  [${postNum}] ${p.scene.label} [${p.format}${p.storyFormat ? `:${p.storyFormat}` : ""}]`);

    // ── Reel placeholder — skip ──────────────────────────────
    if (p.format === "reel_placeholder") {
      console.log(`    Skipped (reel placeholder)`);
      result.caption = "Reel placeholder — create manually";
      results.push(result);
      continue;
    }

    // ── Reel: Remotion carousel recap ────────────────────────
    if (p.format === "reel_remotion" && p.recapSource) {
      console.log(`    Carousel recap reel (${p.recapSource.dayName}'s ${p.recapSource.contentType})`);

      // Find the carousel that was generated earlier in this day's results
      // (Wednesday recaps Tuesday — but in daily mode, Tuesday's content was generated yesterday)
      // For now, look in the previous day's content.json
      const prevDate = new Date(targetDate);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDir = path.join(OUTPUT_DIR, formatDate(prevDate));
      const prevManifest = path.join(prevDir, "content.json");

      let slidePaths: string[] = [];
      if (fs.existsSync(prevManifest)) {
        const prev = JSON.parse(fs.readFileSync(prevManifest, "utf-8"));
        for (const post of prev.posts ?? []) {
          if (post.format === "carousel" && post.slides?.length > 0) {
            slidePaths = post.slides
              .map((s: Slide) => s.image ? path.resolve("public", s.image.replace(/^\//, "")) : null)
              .filter((s: string | null): s is string => s !== null && fs.existsSync(s));
            if (slidePaths.length > 0) break;
          }
        }
      }

      if (slidePaths.length === 0) {
        console.log(`    No carousel slides from previous day — skipping`);
        results.push(result);
        continue;
      }

      if (opts.renderVideo) {
        const reelFilename = `${dateStr}_${postNum}_reel_recap.mp4`;
        const reelPath = path.join(dayDir, reelFilename);

        const ok = await renderReel({
          compositionId: "CarouselRecap",
          props: { slides: slidePaths, heading: p.recapSource.contentType.replace(/_/g, " ") },
          outputPath: reelPath,
        });

        if (ok) {
          result.video = reelPath;
          stats.videos++;
        } else {
          console.log(`    Recap reel FAILED`);
          stats.failed++;
        }
      }

      console.log(`    Generating caption...`);
      result.caption = await generateCaption(p.sceneKey, p.scene, plan.astro, 0, i);
      stats.captions++;
      results.push(result);
      continue;
    }

    // ── Reel: Kling living illustration ──────────────────────
    if (p.format === "reel_living" && p.animateScene) {
      const prompt = buildScenePrompt(p.scene);
      const basePath = getBaseForContext(p.scene.palette, plan.astro, p.sceneKey);
      const imgFilename = `${dateStr}_${postNum}_reel_living_src.png`;
      const imgPath = path.join(dayDir, imgFilename);

      console.log(`    Generating source image...`);
      const imgOk = await generateImage(basePath, prompt, imgPath, opts.validate);
      if (imgOk) {
        result.image = imgPath;
        stats.images++;
        saveToBank(imgPath, p.sceneKey);

        if (opts.renderVideo && isFalAvailable()) {
          const videoFilename = `${dateStr}_${postNum}_reel_living.mp4`;
          const videoPath = path.join(dayDir, videoFilename);
          const vidOk = await generateLivingIllustration(imgPath, p.animateScene, videoPath);
          if (vidOk) {
            result.video = videoPath;
            stats.videos++;
          } else {
            stats.failed++;
          }
        }
      } else {
        stats.failed++;
      }

      console.log(`    Generating caption...`);
      result.caption = await generateCaption(p.sceneKey, p.scene, plan.astro, 0, i);
      stats.captions++;
      results.push(result);
      continue;
    }

    // ── Reel: Ken Burns ──────────────────────────────────────
    if (p.format === "reel_kenburns" && p.animateScene) {
      const prompt = buildScenePrompt(p.scene);
      const basePath = getBaseForContext(p.scene.palette, plan.astro, p.sceneKey);
      const imgFilename = `${dateStr}_${postNum}_reel_kenburns_src.png`;
      const imgPath = path.join(dayDir, imgFilename);

      console.log(`    Generating source image...`);
      const imgOk = await generateImage(basePath, prompt, imgPath, opts.validate);
      if (imgOk) {
        result.image = imgPath;
        stats.images++;
        saveToBank(imgPath, p.sceneKey);

        if (opts.renderVideo) {
          const videoFilename = `${dateStr}_${postNum}_reel_kenburns.mp4`;
          const videoPath = path.join(dayDir, videoFilename);
          const ok = await renderReel({
            compositionId: "KenBurns",
            props: { imagePath: imgPath, overlayText: p.scene.label },
            outputPath: videoPath,
          });
          if (ok) {
            result.video = videoPath;
            stats.videos++;
          } else {
            stats.failed++;
          }
        }
      } else {
        stats.failed++;
      }

      console.log(`    Generating caption...`);
      result.caption = await generateCaption(p.sceneKey, p.scene, plan.astro, 0, i);
      stats.captions++;
      results.push(result);
      continue;
    }

    // ── Text slide story ─────────────────────────────────────
    if (p.storyFormat === "text_slide") {
      const cta = p.engagementCta ?? "Tap to engage!";
      const config = ENGAGEMENT_STORY_CONFIG[p.sceneKey];
      const template = config?.template ?? "info";

      console.log(`    Generating story text (CTA: "${cta}")...`);
      const storyText = await generateStoryText(p.sceneKey, p.scene, plan.astro, cta);

      // Pick a bank image for the background
      const bankTags = tagsFromSceneKey(p.sceneKey);
      const seed = targetDate.getTime() + i * 7919;
      const bankImage = pickFromBank(bankTags, seed);
      const bgImage = bankImage ?? getBaseForContext(p.scene.palette, plan.astro, p.sceneKey);
      console.log(`    Background: ${bankImage ? "bank image" : "base image"}`);

      // Animated video
      if (p.storyAnimated && opts.renderVideo) {
        const videoFilename = `${dateStr}_${postNum}_story_animated_text_${p.sceneKey}.mp4`;
        const videoPath = path.join(dayDir, videoFilename);

        console.log(`    Rendering animated text slide...`);
        const vidOk = await renderReel({
          compositionId: "AnimatedTextSlide",
          props: { heading: storyText.heading, body: storyText.body, footer: storyText.footer, template, cta, backgroundImage: bgImage },
          outputPath: videoPath,
        });

        if (vidOk) {
          result.video = videoPath;
          stats.videos++;
        }
      }

      // Static PNG — overlay text on background image
      const filename = `${dateStr}_${postNum}_story_text_${p.sceneKey}.png`;
      const imgPath = path.join(dayDir, filename);

      const slideOk = await renderTextOverlay(
        template as TemplateType,
        { heading: storyText.heading, body: storyText.body, footer: storyText.footer },
        bgImage,
        imgPath,
      );

      if (slideOk) {
        result.image = imgPath;
        stats.textSlides++;
      } else {
        stats.failed++;
      }

      result.caption = cta;
      results.push(result);
      continue;
    }

    // ── Single image ─────────────────────────────────────────
    if (p.format === "single") {
      const prompt = buildScenePrompt(p.scene);
      const basePath = getBaseForContext(p.scene.palette, plan.astro, p.sceneKey);
      const filename = `${dateStr}_${postNum}_${p.slot}_${p.sceneKey}.png`;
      const imgPath = path.join(dayDir, filename);

      console.log(`    Generating image from: ${basePath}`);
      const ok = await generateImage(basePath, prompt, imgPath, opts.validate);
      if (ok) {
        result.image = imgPath;
        stats.images++;
        saveToBank(imgPath, p.sceneKey);

        // Animated kontext story
        if (p.storyAnimated && p.storyFormat === "kontext" && opts.renderVideo) {
          const videoFilename = `${dateStr}_${postNum}_story_animated_${p.sceneKey}.mp4`;
          const videoPath = path.join(dayDir, videoFilename);

          console.log(`    Rendering animated story (KenBurnsStory)...`);
          const vidOk = await renderReel({
            compositionId: "KenBurnsStory",
            props: { imagePath: imgPath, overlayText: p.scene.label },
            outputPath: videoPath,
          });

          if (vidOk) {
            result.video = videoPath;
            stats.videos++;
          }
        }
      } else {
        stats.failed++;
      }

      console.log(`    Generating caption...`);
      result.caption = await generateCaption(p.sceneKey, p.scene, plan.astro, 0, i);
      stats.captions++;
      results.push(result);
      continue;
    }

    // ── Carousel ─────────────────────────────────────────────
    if (p.format === "carousel") {
      const contentType = p.contentType!;
      if (!usedCarouselKeys[contentType]) usedCarouselKeys[contentType] = [];

      const seed = targetDate.getTime() + i * 12345;
      const carouselData = buildCarouselSlides(contentType, usedCarouselKeys[contentType], seed);

      if (!carouselData) {
        console.log(`    No data for ${contentType}, skipping`);
        stats.failed++;
        results.push(result);
        continue;
      }

      usedCarouselKeys[contentType].push(carouselData.dataRef);
      result.dataRef = carouselData.dataRef;
      result.contentType = contentType;

      const slides: Slide[] = [];

      // Slide 1: hook image
      const hookFilename = `${dateStr}_${postNum}_${p.slot}_${p.sceneKey}_slide_01.png`;
      const hookPath = path.join(dayDir, hookFilename);
      const prompt = buildScenePrompt(p.scene);
      const basePath = getBaseForContext(p.scene.palette, plan.astro, p.sceneKey);

      console.log(`    Slide 1 (hook): generating...`);
      const hookOk = await generateImage(basePath, prompt, hookPath, opts.validate);
      if (hookOk) {
        slides.push({ type: "hook_image", image: hookPath });
        result.image = hookPath;
        stats.images++;
        saveToBank(hookPath, p.sceneKey);
      } else {
        slides.push({ type: "hook_image", image: null });
        stats.failed++;
      }

      // Slides 2-N: text slides
      for (let s = 0; s < carouselData.slides.length; s++) {
        const slideSpec = carouselData.slides[s];
        const slideNum = String(s + 2).padStart(2, "0");
        const slideFilename = `${dateStr}_${postNum}_${p.slot}_${p.sceneKey}_slide_${slideNum}.png`;
        const slidePath = path.join(dayDir, slideFilename);

        console.log(`    Slide ${s + 2} (text): ${slideSpec.options.heading}`);
        const slideOk = await renderTextSlide(
          slideSpec.template as TemplateType,
          slideSpec.options as TextSlideOptions,
          slidePath,
        );

        if (slideOk) {
          slides.push({
            type: "text_card",
            image: slidePath,
            textContent: { heading: slideSpec.options.heading, body: slideSpec.options.body, footer: slideSpec.options.footer },
          });
          stats.textSlides++;
        } else {
          stats.failed++;
        }
      }

      result.slides = slides;

      console.log(`    Generating carousel caption...`);
      result.caption = await generateCarouselCaption(p.sceneKey, p.scene, plan.astro, contentType, carouselData.dataRef, 0, i);
      stats.captions++;
      results.push(result);
      continue;
    }

    // Fallback
    results.push(result);
  }

  // 3b. Generate platform-specific caption variants
  console.log(`\n  Generating platform variants...`);
  for (const r of results) {
    if (r.caption && r.caption !== "(caption skipped — no API token)" && r.caption !== "(caption generation failed)") {
      // Skip short CTAs (engagement stories) — same text works everywhere
      if (r.engagementCta && r.caption === r.engagementCta) {
        r.captions = { instagram: r.caption, facebook: r.caption, threads: r.caption };
        continue;
      }
      r.captions = await generatePlatformVariants(r.caption);
      console.log(`    ${r.label}: IG ${r.captions.instagram.length} chars | FB ${r.captions.facebook.length} chars | Threads ${r.captions.threads.length} chars`);
    }
  }

  // 4. Upload to Spellcast + schedule
  if (spellcast && !opts.dryRun) {
    console.log("\n" + "=".repeat(60));
    console.log("UPLOADING TO SPELLCAST");
    console.log("=".repeat(60));

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (!r.caption && !r.image && !r.video) continue;

      const slot = plan.posts[i].slot;
      const scheduleTime = getScheduleTime(targetDate, slot, slotCounters[slot]++);

      console.log(`\n  [${String(i + 1).padStart(2, "0")}] ${r.label} → ${slot} @ ${scheduleTime}`);

      try {
        const mediaIds: string[] = [];

        // Upload carousel slides or single media
        if (r.format === "carousel" && r.slides.length > 0) {
          for (const slide of r.slides) {
            const mediaPath = slide.video ?? slide.image;
            if (mediaPath && fs.existsSync(mediaPath)) {
              console.log(`    Uploading: ${path.basename(mediaPath)}`);
              const uploaded = await spellcast.uploadMediaFile(mediaPath);
              mediaIds.push(uploaded.id);
              stats.uploaded++;
            }
          }
        } else {
          // Prefer video over image for stories/reels
          const mediaPath = r.video ?? r.image;
          if (mediaPath && fs.existsSync(mediaPath)) {
            console.log(`    Uploading: ${path.basename(mediaPath)}`);
            const uploaded = await spellcast.uploadMediaFile(mediaPath);
            mediaIds.push(uploaded.id);
            stats.uploaded++;
          }

          // For animated stories, also upload the static PNG as fallback
          if (r.video && r.image && r.image !== r.video && fs.existsSync(r.image)) {
            console.log(`    Uploading fallback: ${path.basename(r.image)}`);
            const uploaded = await spellcast.uploadMediaFile(r.image);
            mediaIds.push(uploaded.id);
            stats.uploaded++;
          }
        }

        if (mediaIds.length > 0 && r.caption) {
          console.log(`    Scheduling across platforms...`);
          const igCaption = r.captions?.instagram ?? r.caption;
          const fbCaption = r.captions?.facebook ?? r.caption;
          const thCaption = r.captions?.threads ?? r.caption;

          const postType = slot === "story" ? "story" as const : "post" as const;
          const post = await spellcast.createPost({
            integrations: [
              { id: INTEGRATIONS.instagram, content: igCaption, mediaIds, providerIdentifier: "instagram-standalone" },
              { id: INTEGRATIONS.facebook, content: fbCaption, mediaIds, providerIdentifier: "facebook" },
              { id: INTEGRATIONS.threads, content: thCaption, mediaIds, providerIdentifier: "threads" },
            ],
            scheduledFor: scheduleTime,
            postType,
          });
          r.spellcastPostId = post.id;
          stats.scheduled++;
          console.log(`    Scheduled: ${post.id}`);
        }
      } catch (err) {
        console.error(`    Upload/schedule failed: ${err}`);
        stats.failed++;
      }
    }
  }

  // 5. Save manifest
  const manifest = {
    generatedAt: new Date().toISOString(),
    date: dateStr,
    dayName: plan.astro.dayName,
    astro: plan.astro,
    dryRun: opts.dryRun,
    posts: results,
    stats,
  };

  const manifestPath = path.join(dayDir, "content.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // 6. Summary
  console.log("\n" + "=".repeat(60));
  console.log("DONE!");
  console.log(`  Images generated: ${stats.images}`);
  console.log(`  Text slides: ${stats.textSlides}`);
  console.log(`  Videos rendered: ${stats.videos}`);
  console.log(`  Captions: ${stats.captions}`);
  console.log(`  Media uploaded: ${stats.uploaded}`);
  console.log(`  Posts scheduled: ${stats.scheduled}`);
  console.log(`  Failed: ${stats.failed}`);
  console.log(`  Manifest: ${manifestPath}`);
  const cost = stats.images * 0.01;
  console.log(`  Estimated cost: ~$${cost.toFixed(2)}`);
  console.log("=".repeat(60));
  console.log();
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const flags = parseArgs();

  const dryRun = flags["dry-run"] === "true";
  const validate = flags["no-validate"] !== "true";
  const renderVideo = flags["no-video"] !== "true";
  const isWeek = flags["week"] === "true";

  if (dryRun) console.log("\n  DRY RUN — content will be generated but not uploaded\n");

  if (isWeek) {
    // Generate Mon–Sun starting from --date (snapped to Monday) or next Monday
    const startDate = flags.date
      ? getNextMonday(new Date(flags.date + "T00:00:00"))
      : getNextMonday();

    console.log(`\n  WEEKLY MODE — generating ${formatDate(startDate)} to ${formatDate(new Date(startDate.getTime() + 6 * 86400000))}\n`);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);
      await generateDay(day, { dryRun, validate, renderVideo });
    }
  } else {
    const targetDate = flags.date
      ? new Date(flags.date + "T00:00:00")
      : getTomorrow();

    await generateDay(targetDate, { dryRun, validate, renderVideo });
  }
}

main().catch((err) => {
  console.error("Daily generation failed:", err);
  process.exit(1);
});
