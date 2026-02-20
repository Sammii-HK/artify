#!/usr/bin/env npx tsx
/**
 * Sammii Spellbound — Content Pipeline
 *
 * Generates a full week of Instagram content based on real astrology data,
 * the 42 scenes defined in scenes.ts, DeepInfra Flux Kontext for images,
 * and DeepInfra Llama for captions.
 *
 * Usage:
 *   npx tsx scripts/content-pipeline.ts plan --week next
 *   npx tsx scripts/content-pipeline.ts generate --week next
 *   npx tsx scripts/content-pipeline.ts single --scene tarot_17_star
 *   npx tsx scripts/content-pipeline.ts types
 */

import * as fs from "fs";
import * as path from "path";
import { SCENES, PALETTES, buildScenePrompt, scenesByDay, type Scene } from "../src/lib/scenes";
import { STYLES, type StyleKey } from "../src/lib/styles";
import {
  getAstroContext,
  getSabbatNear,
  type AstroContext,
  type Sabbat,
} from "../src/lib/astro";
import { buildCarouselSlides, CAROUSEL_TYPES } from "./carousel-types";
import { renderTextSlide, renderTextOverlay, type TemplateType, type TextSlideOptions } from "./text-slide-renderer";
import { generateLivingIllustration, isFalAvailable, MOTION_PROMPTS } from "./fal-video";
import { renderReel } from "./render-reel";
import {
  buildDayPlan,
  buildWeeklyCalendar,
  ENGAGEMENT_STORY_CONFIG,
  generateImage as generateImageShared,
  validateHands as validateHandsShared,
  getBaseForPalette as getBaseForPaletteShared,
  generateCaption as generateCaptionShared,
  generateCarouselCaption as generateCarouselCaptionShared,
  generateStoryText as generateStoryTextShared,
} from "../src/lib/pipeline";
import type { ScheduledPost, DayPlan } from "../src/lib/pipeline";

// ---------------------------------------------------------------------------
// Load .env.local (same file Next.js uses)
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

const DEEPINFRA_TOKEN = process.env.DEEPINFRA_API_TOKEN ?? "";
const IMAGE_API = "https://api.deepinfra.com/v1/openai/images/edits";
const IMAGE_MODEL = "black-forest-labs/FLUX.1-Kontext-dev";
const LLM_API = "https://api.deepinfra.com/v1/openai/chat/completions";
const LLM_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo";
const VISION_MODEL = "meta-llama/Llama-3.2-11B-Vision-Instruct";
const OUTPUT_DIR = "public/content";
const BASE_IMAGE = "public/sammii-spellbound.png";
const COLOURED_DIR = "public/coloured";

// Maps scene palette → colouring style from styles.ts
const PALETTE_TO_STYLE: Record<keyof typeof PALETTES, StyleKey> = {
  celestial: "celestial_glow",
  mystic: "shadow_ritual",
  earthy: "sage_earth",
  oceanic: "ocean_mystic",
  solar: "fire_sorceress",
  cream: "soft_watercolour",
  indigo: "high_priestess",
};

// ---------------------------------------------------------------------------
// Coloured base image cache
// ---------------------------------------------------------------------------

/** Return the path to a cached coloured image for a palette, or the raw sketch if not cached. */
function getBaseForPalette(palette: keyof typeof PALETTES): string {
  return getBaseForPaletteShared(palette);
}

/** Generate coloured base images. Use --force to regenerate (backs up first). Use --only key1,key2 to target specific styles. */
async function cmdColour(force = false, only?: string[]) {
  if (!DEEPINFRA_TOKEN) {
    console.error("No DEEPINFRA_API_TOKEN set. Export it or add to .env.local.");
    process.exit(1);
  }

  fs.mkdirSync(COLOURED_DIR, { recursive: true });
  const allStyleKeys = [...new Set(Object.values(PALETTE_TO_STYLE))];
  const styleKeys = only ? allStyleKeys.filter((k) => only.includes(k)) : allStyleKeys;

  // If forcing, back up existing files first
  if (force) {
    const backupDir = path.join(COLOURED_DIR, "backups", new Date().toISOString().replace(/[:.]/g, "-"));
    const existingFiles = styleKeys.filter((k) => fs.existsSync(path.join(COLOURED_DIR, `${k}.png`)));
    if (existingFiles.length > 0) {
      fs.mkdirSync(backupDir, { recursive: true });
      for (const k of existingFiles) {
        const src = path.join(COLOURED_DIR, `${k}.png`);
        const dst = path.join(backupDir, `${k}.png`);
        fs.copyFileSync(src, dst);
      }
      console.log(`\n  Backed up ${existingFiles.length} existing bases to ${backupDir}`);
    }
  }

  console.log();
  console.log("GENERATING COLOURED BASE IMAGES");
  console.log("=".repeat(60));

  let created = 0;
  let skipped = 0;

  for (const styleKey of styleKeys) {
    const outPath = path.join(COLOURED_DIR, `${styleKey}.png`);
    if (!force && fs.existsSync(outPath)) {
      console.log(`  ${styleKey} — already exists, skipping (use --force to regenerate)`);
      skipped++;
      continue;
    }

    const style = STYLES[styleKey];
    console.log(`  ${styleKey} (${style.label}) — generating...`);
    const ok = await generateImage(BASE_IMAGE, style.prompt, outPath);
    if (ok) {
      console.log(`    Saved: ${outPath}`);
      created++;
    } else {
      console.log(`    FAILED`);
    }
  }

  console.log();
  console.log("=".repeat(60));
  console.log(`Created: ${created} | Skipped (cached): ${skipped}`);
  console.log(`Cost: ~$${(created * 0.01).toFixed(2)}`);
  console.log("=".repeat(60));
  console.log();
}

// Caption generation, story text, opening styles, Lunary mentions
// → all delegated to src/lib/pipeline/caption-gen.ts (see imports)

async function generateCaption(
  sceneKey: string,
  scene: Scene,
  astro: AstroContext,
  dayIndex = 0,
  postIndex = 0,
): Promise<string> {
  return generateCaptionShared(sceneKey, scene, astro, dayIndex, postIndex);
}

async function generateCarouselCaption(
  sceneKey: string,
  scene: Scene,
  astro: AstroContext,
  contentType: string,
  dataRef: string,
  dayIndex = 0,
  postIndex = 0,
): Promise<string> {
  return generateCarouselCaptionShared(sceneKey, scene, astro, contentType, dataRef, dayIndex, postIndex);
}

// Story text generation → delegated to src/lib/pipeline/caption-gen.ts

async function generateStoryText(
  sceneKey: string,
  scene: Scene,
  astro: AstroContext,
  cta: string,
): Promise<{ heading: string; body: string[]; footer: string }> {
  return generateStoryTextShared(sceneKey, scene, astro, cta);
}

// ---------------------------------------------------------------------------
// Image generation — DeepInfra Flux Kontext
// ---------------------------------------------------------------------------

async function generateImage(
  baseImagePath: string,
  prompt: string,
  outputPath: string,
  validate = true,
): Promise<boolean> {
  return generateImageShared(baseImagePath, prompt, outputPath, validate);
}

async function validateHands(
  imagePath: string,
): Promise<{ pass: boolean; reason: string }> {
  return validateHandsShared(imagePath);
}

// ---------------------------------------------------------------------------
// Weekly scheduler — delegated to src/lib/pipeline/day-plan.ts
// ---------------------------------------------------------------------------

const MAX_FAL_VIDEOS_PER_WEEK = 1;

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function getWeekStart(which: "this" | "next"): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  // Monday = day 1, Sunday = day 0 → offset to Monday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  if (which === "next") monday.setDate(monday.getDate() + 7);
  return monday;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function cmdPlan(startDate: Date) {
  const calendar = buildWeeklyCalendar(startDate);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  console.log();
  console.log("SAMMII SPELLBOUND — WEEKLY CONTENT PLAN");
  console.log(
    `  ${startDate.toLocaleDateString("en-GB", { month: "long", day: "numeric" })} -> ${endDate.toLocaleDateString("en-GB", { month: "long", day: "numeric", year: "numeric" })}`
  );
  console.log("=".repeat(60));

  let feedCount = 0;
  let kontextStoryCount = 0;
  let textStoryCount = 0;
  let reelCount = 0;
  let carouselCount = 0;
  let falVideoCount = 0;
  let animatedStoryCount = 0;

  for (const day of calendar) {
    const { moon, zodiac, sabbat } = day.astro;
    console.log();
    console.log(
      `${day.astro.dayName.toUpperCase()} ${formatDate(day.date)}`
    );
    console.log(
      `  ${moon.emoji} ${moon.name} (${moon.illumination}%) | ${zodiac.symbol} ${zodiac.sign} season`
    );

    if (sabbat) {
      console.log(`  SABBAT: ${sabbat.name} — ${sabbat.theme}`);
    }

    for (const p of day.posts) {
      let label: string;
      if (p.format === "reel_remotion") {
        label = "[Reel:Recap]";
        reelCount++;
      } else if (p.format === "reel_living") {
        label = "[Reel:Kling]";
        reelCount++;
        falVideoCount++;
      } else if (p.format === "reel_kenburns") {
        label = "[Reel:KenB] ";
        reelCount++;
      } else if (p.format === "reel_placeholder") {
        label = "[Reel]      ";
        reelCount++;
      } else if (p.slot === "story" && p.storyFormat === "text_slide") {
        label = "[Story:Text]";
        textStoryCount++;
      } else if (p.slot === "story") {
        label = "[Story:Img] ";
        kontextStoryCount++;
      } else {
        label = "[Feed]      ";
        feedCount++;
      }

      const videoMarker = p.storyAnimated ? " [VIDEO]" : "";
      if (p.storyAnimated) animatedStoryCount++;
      const fmt = p.format === "carousel" ? ` [Carousel: ${p.contentType}]` : "";
      const cta = p.engagementCta ? ` — "${p.engagementCta}"` : "";
      const recap = p.recapSource ? ` (recap of ${p.recapSource.dayName}'s ${p.recapSource.contentType})` : "";
      const motion = p.animateScene && MOTION_PROMPTS[p.animateScene]
        ? ` — "${MOTION_PROMPTS[p.animateScene].slice(0, 50)}..."`
        : "";
      console.log(`  ${label} ${p.scene.label} (${p.sceneKey})${fmt}${cta}${recap}${motion}${videoMarker}`);
      if (p.format === "carousel") carouselCount++;
    }
  }

  const total = feedCount + kontextStoryCount + textStoryCount + reelCount;
  const kontextCost = (feedCount + kontextStoryCount) * 0.01;
  const falCost = falVideoCount * 0.35;
  const totalCost = kontextCost + falCost;

  console.log();
  console.log("=".repeat(60));
  console.log(`Feed posts: ${feedCount} (${carouselCount} carousels, ${feedCount - carouselCount} singles)`);
  console.log(`Kontext stories: ${kontextStoryCount} (AI-generated images)`);
  console.log(`Text stories: ${textStoryCount} (engagement slides — free)`);
  console.log(`Animated stories: ${animatedStoryCount} (Remotion video — free)`);
  console.log(`Reels: ${reelCount} (${falVideoCount} Kling @ $0.35, rest Remotion — free)`);
  console.log(`Total: ${total} items/week`);
  console.log(`Estimated cost: ~$${totalCost.toFixed(2)} (Kontext: $${kontextCost.toFixed(2)} + fal.ai: $${falCost.toFixed(2)})`);
  console.log("=".repeat(60));

  // Save plan JSON (no images/captions yet — just the schedule + astro)
  const weekDir = path.join(OUTPUT_DIR, formatDate(startDate));
  fs.mkdirSync(weekDir, { recursive: true });
  const manifest = buildManifest(calendar);
  const planPath = path.join(weekDir, "plan.json");
  fs.writeFileSync(planPath, JSON.stringify(manifest, null, 2));
  console.log(`Plan saved: ${planPath}`);
  console.log();

  return calendar;
}

interface SlideTextContent {
  heading: string;
  body: string[];
  footer?: string;
}

interface Slide {
  type: "hook_image" | "text_card";
  image: string | null;
  video?: string | null;
  textContent?: SlideTextContent;
}

interface ContentPost {
  sceneKey: string;
  label: string;
  day: string;
  slot: "feed" | "story" | "reel";
  image: string | null;
  video: string | null;
  caption: string | null;
  astro: AstroContext;
  format: "single" | "carousel" | "reel_placeholder" | "reel_remotion" | "reel_living" | "reel_kenburns";
  slides: Slide[];
  contentType?: string;
  dataRef?: string;
  storyFormat?: "kontext" | "text_slide";
  engagementCta?: string;
  storyAnimated?: boolean;
}

interface ContentManifest {
  generatedAt: string;
  weekStart: string;
  weekEnd: string;
  days: {
    date: string;
    dayName: string;
    astro: AstroContext;
    posts: ContentPost[];
  }[];
}

function buildManifest(calendar: DayPlan[]): ContentManifest {
  const start = calendar[0].date;
  const end = calendar[calendar.length - 1].date;
  return {
    generatedAt: new Date().toISOString(),
    weekStart: formatDate(start),
    weekEnd: formatDate(end),
    days: calendar.map((day) => ({
      date: formatDate(day.date),
      dayName: day.astro.dayName,
      astro: day.astro,
      posts: day.posts.map((p) => ({
        sceneKey: p.sceneKey,
        label: p.scene.label,
        day: p.scene.day,
        slot: p.slot,
        image: null,
        video: null,
        caption: null,
        astro: day.astro,
        format: p.format,
        slides: [] as Slide[],
        contentType: p.contentType,
        dataRef: p.dataRef,
        storyFormat: p.storyFormat,
        engagementCta: p.engagementCta,
        storyAnimated: p.storyAnimated,
      })),
    })),
  };
}

async function cmdGenerate(startDate: Date, validate = true) {
  if (!DEEPINFRA_TOKEN) {
    console.error("No DEEPINFRA_API_TOKEN set. Export it or add to .env.local.");
    process.exit(1);
  }

  const calendar = cmdPlan(startDate);
  const weekDir = path.join(OUTPUT_DIR, formatDate(startDate));
  fs.mkdirSync(weekDir, { recursive: true });

  const manifest = buildManifest(calendar);

  console.log("GENERATING CONTENT...");
  console.log("=".repeat(60));

  let kontextImages = 0;
  let textSlides = 0;
  let falVideos = 0;
  let remotionReels = 0;
  let animatedStories = 0;
  let failed = 0;

  const withVideoSlides = process.argv.includes("--with-video-slides");
  let falVideosBudget = MAX_FAL_VIDEOS_PER_WEEK;

  // Track used data keys per carousel type to avoid repeats within the week
  const usedCarouselKeys: Record<string, string[]> = {};

  for (let d = 0; d < calendar.length; d++) {
    const day = calendar[d];

    for (let i = 0; i < day.posts.length; i++) {
      const p = day.posts[i];
      const postNum = String(i + 1).padStart(2, "0");
      const dateStr = formatDate(day.date);

      console.log();
      console.log(`  ${day.astro.dayName} — ${p.scene.label} [${p.format}${p.storyFormat ? `:${p.storyFormat}` : ""}]`);

      // ── Reel placeholder — skip with log ───────────────────────
      if (p.format === "reel_placeholder") {
        console.log(`    REEL SLOT — create manually`);
        manifest.days[d].posts[i].caption = "Reel placeholder — create and upload manually";
        continue;
      }

      // ── Reel: Remotion carousel recap ──────────────────────────
      if (p.format === "reel_remotion" && p.recapSource) {
        console.log(`    Carousel recap reel (${p.recapSource.dayName}'s ${p.recapSource.contentType})`);

        // Find Tuesday's carousel slides from earlier in the manifest
        const sourceDayManifest = manifest.days.find(
          (md) => md.dayName === p.recapSource!.dayName,
        );
        const sourcePost = sourceDayManifest?.posts.find(
          (mp) => mp.format === "carousel" && mp.slides.length > 0,
        );

        if (!sourcePost || sourcePost.slides.length === 0) {
          console.log(`    No carousel slides found for ${p.recapSource.dayName} — skipping`);
          manifest.days[d].posts[i].caption = "Carousel recap skipped — no source slides";
          continue;
        }

        // Collect absolute paths to slide PNGs
        const slidePaths = sourcePost.slides
          .map((s) => s.image ? path.join(__dirname, "..", "public", s.image) : null)
          .filter((s): s is string => s !== null);

        if (slidePaths.length === 0) {
          console.log(`    No slide images available — skipping`);
          continue;
        }

        const reelFilename = `${dateStr}_${postNum}_reel_recap.mp4`;
        const reelPublicPath = `/content/${formatDate(startDate)}/${reelFilename}`;
        const reelPath = path.join(weekDir, reelFilename);

        const heading = sourcePost.label ?? "";
        const ok = await renderReel({
          compositionId: "CarouselRecap",
          props: { slides: slidePaths, heading },
          outputPath: reelPath,
        });

        if (ok) {
          manifest.days[d].posts[i].video = reelPublicPath;
          remotionReels++;
        } else {
          console.log(`    Recap reel FAILED`);
          failed++;
        }

        // Generate reel caption
        console.log(`    Generating reel caption...`);
        const caption = await generateCaption(p.sceneKey, p.scene, day.astro, d, i);
        manifest.days[d].posts[i].caption = caption;
        continue;
      }

      // ── Reel: Kling living illustration ────────────────────────
      if (p.format === "reel_living" && p.animateScene) {
        console.log(`    Living illustration reel (${p.animateScene})`);

        if (!isFalAvailable()) {
          console.log(`    No FAL_API_KEY — skipping Kling video`);
          manifest.days[d].posts[i].caption = "Living illustration skipped — no FAL_API_KEY";
          continue;
        }

        // Generate source image via Kontext (same as single flow)
        const prompt = buildScenePrompt(p.scene);
        const basePath = getBaseForPalette(p.scene.palette);
        const imgFilename = `${dateStr}_${postNum}_reel_living_src.png`;
        const imgPath = path.join(weekDir, imgFilename);

        console.log(`    Generating source image...`);
        const imgOk = await generateImage(basePath, prompt, imgPath, validate);
        if (!imgOk) {
          console.log(`    Source image FAILED — skipping video`);
          failed++;
          continue;
        }
        kontextImages++;

        const videoFilename = `${dateStr}_${postNum}_reel_living.mp4`;
        const videoPublicPath = `/content/${formatDate(startDate)}/${videoFilename}`;
        const videoPath = path.join(weekDir, videoFilename);

        const vidOk = await generateLivingIllustration(imgPath, p.animateScene, videoPath);
        if (vidOk) {
          manifest.days[d].posts[i].video = videoPublicPath;
          manifest.days[d].posts[i].image = `/content/${formatDate(startDate)}/${imgFilename}`;
          falVideos++;
        } else {
          console.log(`    Kling video FAILED`);
          failed++;
        }

        // Generate reel caption
        console.log(`    Generating reel caption...`);
        const caption = await generateCaption(p.sceneKey, p.scene, day.astro, d, i);
        manifest.days[d].posts[i].caption = caption;
        continue;
      }

      // ── Reel: Ken Burns (Remotion fallback) ────────────────────
      if (p.format === "reel_kenburns" && p.animateScene) {
        console.log(`    Ken Burns reel (${p.animateScene})`);

        // Generate source image via Kontext
        const prompt = buildScenePrompt(p.scene);
        const basePath = getBaseForPalette(p.scene.palette);
        const imgFilename = `${dateStr}_${postNum}_reel_kenburns_src.png`;
        const imgPath = path.join(weekDir, imgFilename);

        console.log(`    Generating source image...`);
        const imgOk = await generateImage(basePath, prompt, imgPath, validate);
        if (!imgOk) {
          console.log(`    Source image FAILED — skipping video`);
          failed++;
          continue;
        }
        kontextImages++;

        const videoFilename = `${dateStr}_${postNum}_reel_kenburns.mp4`;
        const videoPublicPath = `/content/${formatDate(startDate)}/${videoFilename}`;
        const videoPath = path.join(weekDir, videoFilename);

        const ok = await renderReel({
          compositionId: "KenBurns",
          props: { imagePath: imgPath, overlayText: p.scene.label },
          outputPath: videoPath,
        });

        if (ok) {
          manifest.days[d].posts[i].video = videoPublicPath;
          manifest.days[d].posts[i].image = `/content/${formatDate(startDate)}/${imgFilename}`;
          remotionReels++;
        } else {
          console.log(`    Ken Burns reel FAILED`);
          failed++;
        }

        // Generate reel caption
        console.log(`    Generating reel caption...`);
        const caption = await generateCaption(p.sceneKey, p.scene, day.astro, d, i);
        manifest.days[d].posts[i].caption = caption;
        continue;
      }

      // ── Text slide story — generate text + render ──────────────
      if (p.storyFormat === "text_slide") {
        const cta = p.engagementCta ?? "Tap to engage!";
        const config = ENGAGEMENT_STORY_CONFIG[p.sceneKey];
        const template = config?.template ?? "info";

        console.log(`    Generating story text (CTA: "${cta}")...`);
        const storyText = await generateStoryText(p.sceneKey, p.scene, day.astro, cta);

        // Animated text slide video (if marked)
        if (p.storyAnimated) {
          const videoFilename = `${dateStr}_${postNum}_story_animated_text_${p.sceneKey}.mp4`;
          const videoPublicPath = `/content/${formatDate(startDate)}/${videoFilename}`;
          const videoPath = path.join(weekDir, videoFilename);

          console.log(`    Rendering animated text slide (${template})...`);
          const vidOk = await renderReel({
            compositionId: "AnimatedTextSlide",
            props: {
              heading: storyText.heading,
              body: storyText.body,
              footer: storyText.footer,
              template,
              cta,
            },
            outputPath: videoPath,
          });

          if (vidOk) {
            manifest.days[d].posts[i].video = videoPublicPath;
            animatedStories++;
          } else {
            console.log(`    Animated text slide FAILED — falling back to static`);
          }
        }

        // Static PNG fallback (always rendered)
        const filename = `${dateStr}_${postNum}_story_text_${p.sceneKey}.png`;
        const publicPath = `/content/${formatDate(startDate)}/${filename}`;
        const imgPath = path.join(weekDir, filename);

        const slideOk = await renderTextSlide(
          template,
          {
            heading: storyText.heading,
            body: storyText.body,
            footer: storyText.footer,
            style: "B",
            dimensions: { width: 1080, height: 1920 },
          },
          imgPath,
        );

        if (slideOk) {
          console.log(`    Saved: ${imgPath}`);
          manifest.days[d].posts[i].image = publicPath;
          textSlides++;
        } else {
          console.log(`    Text slide FAILED`);
          failed++;
        }

        manifest.days[d].posts[i].caption = cta;
        continue;
      }

      if (p.format === "single") {
        // ── Single image flow (same as before) ──────────────────────
        const prompt = buildScenePrompt(p.scene);
        const basePath = getBaseForPalette(p.scene.palette);
        const filename = `${dateStr}_${postNum}_${p.slot}_${p.sceneKey}.png`;
        const publicPath = `/content/${formatDate(startDate)}/${filename}`;

        console.log(`    Image from: ${basePath}`);
        const imgPath = path.join(weekDir, filename);
        const ok = await generateImage(basePath, prompt, imgPath, validate);
        if (ok) {
          console.log(`    Saved: ${imgPath}`);
          manifest.days[d].posts[i].image = publicPath;
          kontextImages++;

          // Text overlay for kontext stories — adds scene context
          // Original clean image stays at imgPath; overlay saved separately
          if (p.slot === "story" && p.storyFormat === "kontext") {
            const overlayFilename = `${dateStr}_${postNum}_${p.slot}_${p.sceneKey}_overlay.png`;
            const overlayPublicPath = `/content/${formatDate(startDate)}/${overlayFilename}`;
            const overlayPath = path.join(weekDir, overlayFilename);

            console.log(`    Rendering text overlay: "${p.scene.label}"...`);
            const overlayOk = await renderTextOverlay(
              "info",
              {
                heading: p.scene.label,
                body: [p.scene.day],
                footer: "@sammiispellbound",
              },
              imgPath,
              overlayPath,
            );
            if (overlayOk) {
              console.log(`    Saved overlay: ${overlayPath}`);
              manifest.days[d].posts[i].overlayImage = overlayPublicPath;
            } else {
              console.log(`    Overlay FAILED — clean image only`);
            }
          }

          // Animated kontext story — render through KenBurnsStory
          if (p.storyAnimated && p.storyFormat === "kontext") {
            const videoFilename = `${dateStr}_${postNum}_story_animated_${p.sceneKey}.mp4`;
            const videoPublicPath = `/content/${formatDate(startDate)}/${videoFilename}`;
            const videoPath = path.join(weekDir, videoFilename);

            console.log(`    Rendering animated story (KenBurnsStory)...`);
            const vidOk = await renderReel({
              compositionId: "KenBurnsStory",
              props: { imagePath: imgPath, overlayText: p.scene.label },
              outputPath: videoPath,
            });

            if (vidOk) {
              manifest.days[d].posts[i].video = videoPublicPath;
              animatedStories++;
            } else {
              console.log(`    Animated story FAILED — static PNG retained`);
            }
          }
        } else {
          console.log(`    FAILED`);
          failed++;
        }

        // Generate caption
        console.log(`    Generating caption...`);
        const caption = await generateCaption(p.sceneKey, p.scene, day.astro, d, i);
        manifest.days[d].posts[i].caption = caption;
        console.log(`    Caption done`);

      } else {
        // ── Carousel flow ───────────────────────────────────────────
        const contentType = p.contentType!;
        if (!usedCarouselKeys[contentType]) usedCarouselKeys[contentType] = [];

        const seed = day.date.getTime() + i * 12345;
        const carouselData = buildCarouselSlides(contentType, usedCarouselKeys[contentType], seed);

        if (!carouselData) {
          console.log(`    No data available for ${contentType}, skipping`);
          failed++;
          continue;
        }

        usedCarouselKeys[contentType].push(carouselData.dataRef);
        manifest.days[d].posts[i].dataRef = carouselData.dataRef;
        manifest.days[d].posts[i].contentType = contentType;

        const slides: Slide[] = [];

        // Slide 1: Kontext hook image
        const hookFilename = `${dateStr}_${postNum}_${p.slot}_${p.sceneKey}_slide_01.png`;
        const hookPublicPath = `/content/${formatDate(startDate)}/${hookFilename}`;
        const prompt = buildScenePrompt(p.scene);
        const basePath = getBaseForPalette(p.scene.palette);

        console.log(`    Slide 1 (hook): ${basePath}`);
        const hookPath = path.join(weekDir, hookFilename);
        const hookOk = await generateImage(basePath, prompt, hookPath, validate);
        if (hookOk) {
          console.log(`    Saved: ${hookPath}`);
          let hookVideoPath: string | null = null;

          // Mixed carousel: optionally animate hook image with Kling
          if (withVideoSlides && isFalAvailable() && falVideosBudget > 0) {
            const hookVideoFilename = `${dateStr}_${postNum}_${p.slot}_${p.sceneKey}_slide_01_video.mp4`;
            const hookVideoFullPath = path.join(weekDir, hookVideoFilename);
            const hookVideoPublicPath = `/content/${formatDate(startDate)}/${hookVideoFilename}`;
            const animScene = p.sceneKey;

            console.log(`    Animating hook slide with Kling...`);
            const vidOk = await generateLivingIllustration(hookPath, animScene, hookVideoFullPath);
            if (vidOk) {
              hookVideoPath = hookVideoPublicPath;
              falVideos++;
              falVideosBudget--;
            }
          }

          slides.push({ type: "hook_image", image: hookPublicPath, video: hookVideoPath });
          manifest.days[d].posts[i].image = hookPublicPath; // first slide as thumbnail
          kontextImages++;
        } else {
          console.log(`    Hook image FAILED`);
          slides.push({ type: "hook_image", image: null });
          failed++;
        }

        // Slides 2-N: text slides from data
        for (let s = 0; s < carouselData.slides.length; s++) {
          const slideSpec = carouselData.slides[s];
          const slideNum = String(s + 2).padStart(2, "0");
          const slideFilename = `${dateStr}_${postNum}_${p.slot}_${p.sceneKey}_slide_${slideNum}.png`;
          const slidePublicPath = `/content/${formatDate(startDate)}/${slideFilename}`;
          const slidePath = path.join(weekDir, slideFilename);

          console.log(`    Slide ${s + 2} (text): ${slideSpec.template} — ${slideSpec.options.heading}`);
          const slideOk = await renderTextSlide(
            slideSpec.template as TemplateType,
            slideSpec.options as TextSlideOptions,
            slidePath,
          );

          if (slideOk) {
            console.log(`    Saved: ${slidePath}`);
            slides.push({
              type: "text_card",
              image: slidePublicPath,
              textContent: {
                heading: slideSpec.options.heading,
                body: slideSpec.options.body,
                footer: slideSpec.options.footer,
              },
            });
            textSlides++;
          } else {
            console.log(`    Text slide FAILED`);
            failed++;
          }
        }

        manifest.days[d].posts[i].slides = slides;
        manifest.days[d].posts[i].format = "carousel";

        // Generate caption with carousel context
        console.log(`    Generating carousel caption...`);
        const carouselCaption = await generateCarouselCaption(p.sceneKey, p.scene, day.astro, contentType, carouselData.dataRef, d, i);
        manifest.days[d].posts[i].caption = carouselCaption;
        console.log(`    Caption done`);
      }
    }
  }

  // Save manifest
  const manifestPath = path.join(weekDir, "content.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log();
  console.log("=".repeat(60));
  console.log("DONE!");
  console.log(`  Kontext images: ${kontextImages}`);
  console.log(`  Text slides: ${textSlides}`);
  console.log(`  Remotion reels: ${remotionReels}`);
  console.log(`  Animated stories: ${animatedStories} (Remotion — free)`);
  console.log(`  fal.ai videos: ${falVideos} ($${(falVideos * 0.35).toFixed(2)})`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Manifest: ${manifestPath}`);
  const totalCostGen = kontextImages * 0.01 + falVideos * 0.35;
  console.log(`  Estimated cost: ~$${totalCostGen.toFixed(2)} (Kontext: $${(kontextImages * 0.01).toFixed(2)} + fal.ai: $${(falVideos * 0.35).toFixed(2)})`);
  console.log("=".repeat(60));
}

async function cmdSingle(sceneKey: string, validate = true) {
  if (!(sceneKey in SCENES)) {
    console.error(`Unknown scene: ${sceneKey}`);
    console.error(`Available: ${Object.keys(SCENES).join(", ")}`);
    process.exit(1);
  }

  const scene = SCENES[sceneKey];
  const astro = getAstroContext(new Date());
  const prompt = buildScenePrompt(scene);
  const basePath = getBaseForPalette(scene.palette);

  console.log();
  console.log(`Generating: ${scene.label} (${sceneKey})`);
  console.log(`  Moon: ${astro.moon.emoji} ${astro.moon.name}`);
  console.log(`  Zodiac: ${astro.zodiac.symbol} ${astro.zodiac.sign}`);
  console.log(`  Base: ${basePath}`);

  const singlesDir = path.join(OUTPUT_DIR, "singles");
  fs.mkdirSync(singlesDir, { recursive: true });

  const filename = `${sceneKey}.png`;
  const imgPath = path.join(singlesDir, filename);
  const publicPath = `/content/singles/${filename}`;

  const result: ContentPost = {
    sceneKey,
    label: scene.label,
    day: scene.day,
    slot: "feed",
    image: null,
    video: null,
    caption: null,
    astro,
    format: "single",
    slides: [],
  };

  if (DEEPINFRA_TOKEN) {
    const ok = await generateImage(basePath, prompt, imgPath, validate);
    if (ok) {
      console.log(`\n  Image: ${imgPath}`);
      result.image = publicPath;
    } else {
      console.log(`\n  Image generation failed`);
    }

    console.log(`  Generating caption...`);
    result.caption = await generateCaption(sceneKey, scene, astro);
    console.log(`\nCaption:\n${result.caption}`);
  } else {
    console.log("\nNo DEEPINFRA_API_TOKEN — showing prompt only:");
    console.log(prompt);
  }

  // Save/update singles manifest
  const manifestPath = path.join(singlesDir, "content.json");
  let singles: ContentPost[] = [];
  if (fs.existsSync(manifestPath)) {
    singles = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  }
  // Replace if same scene already exists, otherwise append
  const idx = singles.findIndex((s) => s.sceneKey === sceneKey);
  if (idx >= 0) singles[idx] = result;
  else singles.push(result);
  fs.writeFileSync(manifestPath, JSON.stringify(singles, null, 2));
  console.log(`  Manifest: ${manifestPath}`);
}

function cmdTypes() {
  console.log();
  console.log("SAMMII SPELLBOUND — ALL SCENES");
  console.log("=".repeat(60));

  const groups = scenesByDay();
  for (const group of groups) {
    console.log();
    console.log(`  ${group.day}`);
    console.log(`  ${"-".repeat(40)}`);
    for (const { key, scene } of group.scenes) {
      console.log(`    ${key.padEnd(25)} ${scene.label}`);
    }
  }

  console.log();
  console.log(`Total scenes: ${Object.keys(SCENES).length}`);
  console.log();
}

// ---------------------------------------------------------------------------
// Test — one scene per category, visual comparison
// ---------------------------------------------------------------------------

interface TestScene {
  key: string;
  label: string;
  day: string;
  palette: string;
  image: string | null;
}

async function cmdTest(validate = true) {
  if (!DEEPINFRA_TOKEN) {
    console.error("No DEEPINFRA_API_TOKEN set. Export it or add to .env.local.");
    process.exit(1);
  }

  const TEST_SCENES: { key: string; category: string }[] = [
    { key: "full_moon", category: "Moon Monday" },
    { key: "pendulum", category: "Tarot Tuesday" },
    { key: "pisces_season", category: "Zodiac Wednesday" },
    { key: "amethyst_guide", category: "Crystal Thursday" },
    { key: "candle_magic", category: "Spell Friday" },
    { key: "kitchen_witch", category: "Cosy Saturday" },
    { key: "weekly_affirmation", category: "Sunday" },
    { key: "daily_card_pull", category: "Stories" },
    { key: "crystal_rose_quartz_hold", category: "Carousel Hook" },
    { key: "affirmation_sunrise", category: "Feed Singles" },
  ];

  const testDir = path.join(OUTPUT_DIR, "test");
  fs.mkdirSync(testDir, { recursive: true });

  console.log();
  console.log("SCENE TEST — ONE PER CATEGORY");
  console.log("=".repeat(60));

  const results: TestScene[] = [];
  let generated = 0;
  let failed = 0;

  for (const { key, category } of TEST_SCENES) {
    const scene = SCENES[key];
    const prompt = buildScenePrompt(scene);
    const basePath = getBaseForPalette(scene.palette);
    const filename = `${key}.png`;
    const imgPath = path.join(testDir, filename);
    const publicPath = `/content/test/${filename}`;

    console.log(`\n  [${category}] ${scene.label} (${key})`);
    console.log(`    Palette: ${scene.palette} | Base: ${basePath}`);

    const ok = await generateImage(basePath, prompt, imgPath, validate);
    if (ok) {
      console.log(`    Saved: ${imgPath}`);
      results.push({ key, label: scene.label, day: category, palette: scene.palette, image: publicPath });
      generated++;
    } else {
      console.log(`    FAILED`);
      results.push({ key, label: scene.label, day: category, palette: scene.palette, image: null });
      failed++;
    }
  }

  // Save manifest
  const manifest = { scenes: results };
  const manifestPath = path.join(testDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log();
  console.log("=".repeat(60));
  console.log(`Generated: ${generated} | Failed: ${failed}`);
  console.log(`Cost: ~$${(generated * 0.01).toFixed(2)}`);
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Preview: localhost:3001/test`);
  console.log("=".repeat(60));
  console.log();
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`
Sammii Spellbound — Content Pipeline

Usage:
  npx tsx scripts/content-pipeline.ts <command> [options]

Commands:
  plan      Preview the weekly content calendar
  generate  Generate images + captions for the week
  single    Generate a single scene
  reel      Generate a standalone reel (for testing)
  test      Generate one scene per category (visual comparison)
  colour    Generate coloured base images (cached, only pays once)
  types     List all available scenes

Options:
  --week this|next        Which week (default: next)
  --start YYYY-MM-DD      Custom start date
  --scene <key>           Scene key for 'single' command
  --type <reel-type>      Reel type: carousel-recap, living, kenburns
  --source <content-type> Carousel type for recap reel (e.g. tarot_meaning)
  --no-validate           Skip hand/finger validation on generated images
  --with-video-slides     Animate carousel hook slides with Kling (opt-in, +$0.35 each)

Examples:
  npx tsx scripts/content-pipeline.ts plan --week next
  npx tsx scripts/content-pipeline.ts generate --week next
  npx tsx scripts/content-pipeline.ts generate --week next --with-video-slides
  npx tsx scripts/content-pipeline.ts single --scene tarot_17_star
  npx tsx scripts/content-pipeline.ts reel --type carousel-recap --source tarot_meaning
  npx tsx scripts/content-pipeline.ts reel --type living --scene candle_magic
  npx tsx scripts/content-pipeline.ts reel --type kenburns --scene full_moon
  npx tsx scripts/content-pipeline.ts test
  npx tsx scripts/content-pipeline.ts colour
  npx tsx scripts/content-pipeline.ts types
`);
}

const BOOLEAN_FLAGS = new Set(["force", "no-validate", "with-video-slides"]);

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const flags: Record<string, string> = {};

  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      if (BOOLEAN_FLAGS.has(key)) {
        flags[key] = "true";
      } else if (i + 1 < args.length) {
        flags[key] = args[i + 1];
        i++;
      }
    }
  }

  return { command, flags };
}

async function cmdReel(type: string, sceneKey?: string, source?: string) {
  const reelDir = path.join(OUTPUT_DIR, "reels");
  fs.mkdirSync(reelDir, { recursive: true });

  const astro = getAstroContext(new Date());
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");

  if (type === "carousel-recap") {
    const contentType = source ?? "tarot_meaning";
    console.log(`\nGenerating carousel recap reel (source: ${contentType})`);

    // For standalone testing, we need some slide images.
    // Look for the most recent week's carousel slides or use test images.
    const contentDir = path.resolve(__dirname, "..", OUTPUT_DIR);
    const weekDirs = fs.existsSync(contentDir)
      ? fs.readdirSync(contentDir).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse()
      : [];

    let slidePaths: string[] = [];
    for (const wd of weekDirs) {
      const weekPath = path.join(contentDir, wd);
      const manifestPath = path.join(weekPath, "content.json");
      if (!fs.existsSync(manifestPath)) continue;
      const m = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as ContentManifest;
      for (const day of m.days) {
        for (const post of day.posts) {
          if (post.format === "carousel" && post.slides.length > 0) {
            slidePaths = post.slides
              .map((s) => s.image ? path.resolve(__dirname, "..", "public", s.image) : null)
              .filter((s): s is string => s !== null && fs.existsSync(s));
            if (slidePaths.length > 0) break;
          }
        }
        if (slidePaths.length > 0) break;
      }
      if (slidePaths.length > 0) break;
    }

    if (slidePaths.length === 0) {
      console.error("No carousel slides found in any week's content. Generate a week first.");
      process.exit(1);
    }

    console.log(`  Found ${slidePaths.length} slides`);
    const outputPath = path.join(reelDir, `recap_${timestamp}.mp4`);
    const ok = await renderReel({
      compositionId: "CarouselRecap",
      props: { slides: slidePaths, heading: contentType.replace(/_/g, " ") },
      outputPath,
    });

    if (ok) {
      console.log(`\nReel saved: ${outputPath}`);
    } else {
      console.error("\nReel generation failed");
      process.exit(1);
    }
    return;
  }

  if (type === "living") {
    const scene = sceneKey ?? "candle_magic";
    console.log(`\nGenerating living illustration reel (scene: ${scene})`);

    if (!isFalAvailable()) {
      console.error("No FAL_API_KEY set. Export it or add to .env.local.");
      process.exit(1);
    }

    if (!(scene in SCENES)) {
      console.error(`Unknown scene: ${scene}`);
      process.exit(1);
    }

    // Generate source image
    const sceneObj = SCENES[scene];
    const prompt = buildScenePrompt(sceneObj);
    const basePath = getBaseForPalette(sceneObj.palette);
    const imgPath = path.join(reelDir, `living_${scene}_${timestamp}_src.png`);

    console.log(`  Generating source image...`);
    const imgOk = await generateImage(basePath, prompt, imgPath);
    if (!imgOk) {
      console.error("Source image generation failed");
      process.exit(1);
    }

    const videoPath = path.join(reelDir, `living_${scene}_${timestamp}.mp4`);
    const vidOk = await generateLivingIllustration(imgPath, scene, videoPath);
    if (vidOk) {
      console.log(`\nReel saved: ${videoPath}`);
    } else {
      console.error("\nKling video generation failed");
      process.exit(1);
    }
    return;
  }

  if (type === "kenburns") {
    const scene = sceneKey ?? "full_moon";
    console.log(`\nGenerating Ken Burns reel (scene: ${scene})`);

    if (!(scene in SCENES)) {
      console.error(`Unknown scene: ${scene}`);
      process.exit(1);
    }

    // Generate source image
    const sceneObj = SCENES[scene];
    const prompt = buildScenePrompt(sceneObj);
    const basePath = getBaseForPalette(sceneObj.palette);
    const imgPath = path.join(reelDir, `kenburns_${scene}_${timestamp}_src.png`);

    console.log(`  Generating source image...`);
    const imgOk = await generateImage(basePath, prompt, imgPath);
    if (!imgOk) {
      console.error("Source image generation failed");
      process.exit(1);
    }

    const videoPath = path.join(reelDir, `kenburns_${scene}_${timestamp}.mp4`);
    const ok = await renderReel({
      compositionId: "KenBurns",
      props: { imagePath: imgPath, overlayText: sceneObj.label },
      outputPath: videoPath,
    });

    if (ok) {
      console.log(`\nReel saved: ${videoPath}`);
    } else {
      console.error("\nRemotionrender failed");
      process.exit(1);
    }
    return;
  }

  console.error(`Unknown reel type: ${type}. Use: carousel-recap, living, kenburns`);
  process.exit(1);
}

async function main() {
  const { command, flags } = parseArgs();

  if (!command || command === "help" || command === "--help") {
    printHelp();
    return;
  }

  if (command === "test") {
    const validate = flags["no-validate"] !== "true";
    await cmdTest(validate);
    return;
  }

  if (command === "types") {
    cmdTypes();
    return;
  }

  if (command === "colour" || command === "color") {
    const force = flags.force === "true";
    const only = flags.only ? flags.only.split(",").map((s) => s.trim()) : undefined;
    await cmdColour(force, only);
    return;
  }

  if (command === "reel") {
    const type = flags.type;
    if (!type) {
      console.error("Missing --type flag. Use: carousel-recap, living, kenburns");
      process.exit(1);
    }
    await cmdReel(type, flags.scene, flags.source);
    return;
  }

  if (command === "plan" || command === "generate") {
    let startDate: Date;
    if (flags.start) {
      startDate = new Date(flags.start + "T00:00:00");
    } else {
      const week = (flags.week as "this" | "next") ?? "next";
      startDate = getWeekStart(week);
    }

    if (command === "plan") {
      cmdPlan(startDate);
    } else {
      const validate = flags["no-validate"] !== "true";
      await cmdGenerate(startDate, validate);
    }
    return;
  }

  if (command === "single") {
    const sceneKey = flags.scene;
    if (!sceneKey) {
      console.error("Missing --scene flag. Example: --scene tarot_17_star");
      process.exit(1);
    }
    const validate = flags["no-validate"] !== "true";
    await cmdSingle(sceneKey, validate);
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
