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
import { renderTextSlide, type TemplateType, type TextSlideOptions } from "./text-slide-renderer";

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
  const styleKey = PALETTE_TO_STYLE[palette];
  const cached = path.join(COLOURED_DIR, `${styleKey}.png`);
  if (fs.existsSync(cached)) return cached;
  return BASE_IMAGE;
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

// ---------------------------------------------------------------------------
// Caption generation — DeepInfra Llama
// ---------------------------------------------------------------------------

const CAPTION_SYSTEM_PROMPT =
  "You are Sammii Spellbound, writing Instagram captions for a witchcraft, tarot, and astrology account. " +
  "Your tone is warm and knowledgeable — like a friend who knows a lot about witchcraft. " +
  "Speak directly to the reader with \"you\". Be practical and grounded. " +
  "Occasionally playful, never preachy or condescending. " +
  "Weave in astrological context naturally. " +
  "End with 5-8 relevant hashtags. Keep captions under 200 words.";

async function generateCaption(
  sceneKey: string,
  scene: Scene,
  astro: AstroContext
): Promise<string> {
  if (!DEEPINFRA_TOKEN) return "(caption skipped — no API token)";

  const userMsg =
    `Write an Instagram caption for this post:\n` +
    `Scene: ${scene.label} (${sceneKey})\n` +
    `Day: ${astro.dayName}\n` +
    `Moon: ${astro.moon.emoji} ${astro.moon.name} (${astro.moon.illumination}% illumination)\n` +
    `Zodiac season: ${astro.zodiac.symbol} ${astro.zodiac.sign}\n` +
    (astro.sabbat
      ? `Sabbat nearby: ${astro.sabbat.name} — ${astro.sabbat.theme}\n`
      : "") +
    `\nWrite a warm, engaging caption that weaves in the astro context naturally.`;

  const res = await fetch(LLM_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPINFRA_TOKEN}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: CAPTION_SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      max_tokens: 400,
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  Caption API error: ${res.status} ${err}`);
    return "(caption generation failed)";
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim() ?? "(empty response)";
}

async function generateCarouselCaption(
  sceneKey: string,
  scene: Scene,
  astro: AstroContext,
  contentType: string,
  dataRef: string,
): Promise<string> {
  if (!DEEPINFRA_TOKEN) return "(caption skipped — no API token)";

  const userMsg =
    `Write an Instagram caption for a CAROUSEL post (multiple slides):\n` +
    `Content type: ${contentType.replace(/_/g, " ")}\n` +
    `Data topic: ${dataRef.replace(/_/g, " ")}\n` +
    `Scene: ${scene.label} (${sceneKey})\n` +
    `Day: ${astro.dayName}\n` +
    `Moon: ${astro.moon.emoji} ${astro.moon.name} (${astro.moon.illumination}% illumination)\n` +
    `Zodiac season: ${astro.zodiac.symbol} ${astro.zodiac.sign}\n` +
    (astro.sabbat
      ? `Sabbat nearby: ${astro.sabbat.name} — ${astro.sabbat.theme}\n`
      : "") +
    `\nWrite a warm caption that introduces the topic and encourages swiping through all slides. ` +
    `Include a call to action like "Swipe to learn more" or "Save this for later". ` +
    `End with relevant hashtags.`;

  const res = await fetch(LLM_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPINFRA_TOKEN}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: CAPTION_SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      max_tokens: 400,
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  Caption API error: ${res.status} ${err}`);
    return "(caption generation failed)";
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim() ?? "(empty response)";
}

// ---------------------------------------------------------------------------
// Image generation — DeepInfra Flux Kontext
// ---------------------------------------------------------------------------

async function generateImage(
  baseImagePath: string,
  prompt: string,
  outputPath: string,
  validate = true
): Promise<boolean> {
  if (!DEEPINFRA_TOKEN) {
    console.error("  No DEEPINFRA_API_TOKEN set");
    return false;
  }

  if (!fs.existsSync(baseImagePath)) {
    console.error(`  Base image not found: ${baseImagePath}`);
    return false;
  }

  const imageData = fs.readFileSync(baseImagePath);
  const blob = new Blob([imageData], { type: "image/png" });

  const form = new FormData();
  form.append("image", blob, "base.png");
  form.append("prompt", prompt);
  form.append("model", IMAGE_MODEL);
  form.append("n", "1");
  form.append("size", "1024x1024");

  const res = await fetch(IMAGE_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${DEEPINFRA_TOKEN}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  Image API error: ${res.status} ${err}`);
    return false;
  }

  const json = await res.json();
  const entry = json.data?.[0];
  if (!entry) return false;

  if (entry.b64_json) {
    fs.writeFileSync(outputPath, Buffer.from(entry.b64_json, "base64"));
  } else if (entry.url) {
    const img = await fetch(entry.url);
    fs.writeFileSync(outputPath, Buffer.from(await img.arrayBuffer()));
  } else {
    return false;
  }

  // ── Hand / finger validation ──────────────────────────────────
  if (!validate) return true;

  const check = await validateHands(outputPath);
  if (check.pass) {
    console.log(`    Validation: PASS — ${check.reason}`);
    return true;
  }

  console.log(`    Validation: FAIL — ${check.reason}`);
  console.log(`    Retrying image generation...`);

  // Retry once
  const retryRes = await fetch(IMAGE_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${DEEPINFRA_TOKEN}` },
    body: form,
  });

  if (retryRes.ok) {
    const retryJson = await retryRes.json();
    const retryEntry = retryJson.data?.[0];
    if (retryEntry?.b64_json) {
      fs.writeFileSync(outputPath, Buffer.from(retryEntry.b64_json, "base64"));
    } else if (retryEntry?.url) {
      const retryImg = await fetch(retryEntry.url);
      fs.writeFileSync(outputPath, Buffer.from(await retryImg.arrayBuffer()));
    } else {
      console.warn(`    Retry produced no image — keeping first attempt`);
      return true;
    }

    const recheck = await validateHands(outputPath);
    if (recheck.pass) {
      console.log(`    Retry validation: PASS — ${recheck.reason}`);
    } else {
      console.warn(`    Retry validation: FAIL — ${recheck.reason} (keeping image anyway)`);
    }
  } else {
    console.warn(`    Retry API error: ${retryRes.status} — keeping first attempt`);
  }

  return true;
}

// ---------------------------------------------------------------------------
// Hand / finger validation — DeepInfra Llama 3.2 Vision
// ---------------------------------------------------------------------------

async function validateHands(
  imagePath: string
): Promise<{ pass: boolean; reason: string }> {
  if (!DEEPINFRA_TOKEN || !fs.existsSync(imagePath)) {
    return { pass: true, reason: "skipped — no token or image" };
  }

  const b64 = fs.readFileSync(imagePath).toString("base64");
  const dataUrl = `data:image/png;base64,${b64}`;

  const res = await fetch(LLM_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPINFRA_TOKEN}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
            {
              type: "text",
              text:
                "Look at the hands in this illustration. For each visible hand, count the fingers. " +
                "Does every hand have exactly 5 fingers? Reply with only PASS or FAIL followed by a brief reason.",
            },
          ],
        },
      ],
      max_tokens: 100,
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`    Vision validation error: ${res.status} ${err}`);
    return { pass: true, reason: "skipped — API error" };
  }

  const json = await res.json();
  const reply: string =
    json.choices?.[0]?.message?.content?.trim() ?? "";

  const pass = reply.toUpperCase().startsWith("PASS");
  return { pass, reason: reply };
}

// ---------------------------------------------------------------------------
// Weekly scheduler — maps days to scene keys
// ---------------------------------------------------------------------------

interface ScheduledPost {
  sceneKey: string;
  scene: Scene;
  slot: "feed" | "story";
  format: "single" | "carousel";
  contentType?: string;
  dataRef?: string;
}

interface DayPlan {
  date: Date;
  astro: AstroContext;
  posts: ScheduledPost[];
}

function post(key: string, slot: "feed" | "story", format: "single" | "carousel" = "single", contentType?: string): ScheduledPost {
  return { sceneKey: key, scene: SCENES[key], slot, format, contentType };
}

function carousel(contentType: string, slot: "feed" | "story" = "feed"): ScheduledPost {
  const hookScene = CAROUSEL_TYPES[contentType]?.hookScene ?? "tarot_spread_layout";
  return { sceneKey: hookScene, scene: SCENES[hookScene], slot, format: "carousel", contentType };
}

/** Seeded day seed for reproducible randomness */
function daySeed(date: Date): number {
  const str = date.toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}

function buildWeeklyCalendar(startDate: Date): DayPlan[] {
  const calendar: DayPlan[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const astro = getAstroContext(date);
    const posts: ScheduledPost[] = [];
    const day = astro.dayName;

    // Template-based daily scheduling (~42 pieces/week)
    if (day === "Monday") {
      // Feed: 1 moon carousel + 1 single (affirmation)
      posts.push(carousel("moon_guide"));
      posts.push(post("affirmation_sunrise", "feed"));
      // Stories: daily_oracle, moon_energy_update, morning_ritual, moon_phase_checkin
      posts.push(post("daily_oracle", "story"));
      posts.push(post("moon_energy_update", "story"));
      posts.push(post("morning_ritual", "story"));
      posts.push(post("moon_phase_checkin", "story"));
    }

    if (day === "Tuesday") {
      // Feed: 1 tarot carousel + 1 rune carousel
      posts.push(carousel("tarot_meaning"));
      posts.push(carousel("rune_reading"));
      // Stories: daily_card_pull, behind_the_scenes, spell_tip
      posts.push(post("daily_card_pull", "story"));
      posts.push(post("behind_the_scenes", "story"));
      posts.push(post("spell_tip", "story"));
    }

    if (day === "Wednesday") {
      // Feed: 1 zodiac carousel + 1 angel number carousel
      posts.push(carousel("zodiac_breakdown"));
      posts.push(carousel("angel_number"));
      // Stories: crystal_of_the_day, poll_this_or_that, zodiac_meme, daily_oracle
      posts.push(post("crystal_of_the_day", "story"));
      posts.push(post("poll_this_or_that", "story"));
      posts.push(post("zodiac_meme", "story"));
      posts.push(post("daily_oracle", "story"));
    }

    if (day === "Thursday") {
      // Feed: 1 crystal carousel + 1 single (grimoire or mood)
      posts.push(carousel("crystal_guide"));
      const seed = daySeed(date);
      posts.push(post(seed % 2 === 0 ? "grimoire_page" : "mood_rainy_day", "feed"));
      // Stories: ask_sammii, crystal_of_the_day, morning_ritual, gratitude_check
      posts.push(post("ask_sammii", "story"));
      posts.push(post("crystal_of_the_day", "story"));
      posts.push(post("morning_ritual", "story"));
      posts.push(post("gratitude_check", "story"));
    }

    if (day === "Friday") {
      // Feed: 1 spell carousel + 1 chakra carousel
      posts.push(carousel("spell_guide"));
      posts.push(carousel("chakra_guide"));
      // Stories: daily_card_pull, spell_tip, behind_the_scenes, evening_wind_down
      posts.push(post("daily_card_pull", "story"));
      posts.push(post("spell_tip", "story"));
      posts.push(post("behind_the_scenes", "story"));
      posts.push(post("evening_wind_down", "story"));
    }

    if (day === "Saturday") {
      // Feed: 1 sabbat carousel + 1 single (kitchen_witch or tea)
      posts.push(carousel("moon_guide")); // sabbat-themed moon guide
      const seed = daySeed(date);
      posts.push(post(seed % 2 === 0 ? "kitchen_witch" : "tea_reading", "feed"));
      // Stories: daily_oracle, poll_this_or_that, moon_energy_update
      posts.push(post("daily_oracle", "story"));
      posts.push(post("poll_this_or_that", "story"));
      posts.push(post("moon_energy_update", "story"));
    }

    if (day === "Sunday") {
      // Feed: 1 affirmation single + 1 rune/angel carousel
      posts.push(post("weekly_affirmation", "feed"));
      const seed = daySeed(date);
      posts.push(carousel(seed % 2 === 0 ? "rune_reading" : "angel_number"));
      // Stories: moon_phase_checkin, gratitude_check, morning_ritual, evening_wind_down
      posts.push(post("moon_phase_checkin", "story"));
      posts.push(post("gratitude_check", "story"));
      posts.push(post("morning_ritual", "story"));
      posts.push(post("evening_wind_down", "story"));
    }

    // Sabbat override — if within 2 days, add sabbat_altar with matching style
    const nearSabbat = getSabbatNear(date, 2);
    if (nearSabbat) {
      posts.unshift(post("sabbat_altar", "feed"));
    }

    calendar.push({ date, astro, posts });
  }

  return calendar;
}

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

  let total = 0;
  let carouselCount = 0;
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
      const icon = p.slot === "story" ? "[Story]" : "[Feed] ";
      const fmt = p.format === "carousel" ? ` [Carousel: ${p.contentType}]` : "";
      console.log(`  ${icon} ${p.scene.label} (${p.sceneKey})${fmt}`);
      total++;
      if (p.format === "carousel") carouselCount++;
    }
  }

  console.log();
  console.log("=".repeat(60));
  console.log(`Total content pieces: ${total} (${carouselCount} carousels, ${total - carouselCount} singles/stories)`);
  console.log(`Estimated Kontext image cost: ~$${(total * 0.01).toFixed(2)} (text slides are free)`);
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
  textContent?: SlideTextContent;
}

interface ContentPost {
  sceneKey: string;
  label: string;
  day: string;
  slot: "feed" | "story";
  image: string | null;
  caption: string | null;
  astro: AstroContext;
  format: "single" | "carousel";
  slides: Slide[];
  contentType?: string;
  dataRef?: string;
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
        caption: null,
        astro: day.astro,
        format: p.format,
        slides: [] as Slide[],
        contentType: p.contentType,
        dataRef: p.dataRef,
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
  let failed = 0;

  // Track used data keys per carousel type to avoid repeats within the week
  const usedCarouselKeys: Record<string, string[]> = {};

  for (let d = 0; d < calendar.length; d++) {
    const day = calendar[d];

    for (let i = 0; i < day.posts.length; i++) {
      const p = day.posts[i];
      const postNum = String(i + 1).padStart(2, "0");
      const dateStr = formatDate(day.date);

      console.log();
      console.log(`  ${day.astro.dayName} — ${p.scene.label} [${p.format}]`);

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
        } else {
          console.log(`    FAILED`);
          failed++;
        }

        // Generate caption
        console.log(`    Generating caption...`);
        const caption = await generateCaption(p.sceneKey, p.scene, day.astro);
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
          slides.push({ type: "hook_image", image: hookPublicPath });
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
        const carouselCaption = await generateCarouselCaption(p.sceneKey, p.scene, day.astro, contentType, carouselData.dataRef);
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
  console.log(`  Failed: ${failed}`);
  console.log(`  Manifest: ${manifestPath}`);
  console.log(`  Estimated cost: ~$${(kontextImages * 0.01).toFixed(2)} (text slides free)`);
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
  test      Generate one scene per category (visual comparison)
  colour    Generate coloured base images (cached, only pays once)
  types     List all available scenes

Options:
  --week this|next    Which week (default: next)
  --start YYYY-MM-DD  Custom start date
  --scene <key>       Scene key for 'single' command
  --no-validate       Skip hand/finger validation on generated images

Examples:
  npx tsx scripts/content-pipeline.ts plan --week next
  npx tsx scripts/content-pipeline.ts plan --week this
  npx tsx scripts/content-pipeline.ts generate --week next
  npx tsx scripts/content-pipeline.ts single --scene tarot_17_star
  npx tsx scripts/content-pipeline.ts test
  npx tsx scripts/content-pipeline.ts test --no-validate
  npx tsx scripts/content-pipeline.ts colour
  npx tsx scripts/content-pipeline.ts types
`);
}

const BOOLEAN_FLAGS = new Set(["force", "no-validate"]);

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
