#!/usr/bin/env npx tsx
/**
 * Generate Coloured Base Images
 *
 * Takes the pencil sketch and generates coloured versions for every style
 * (palettes, sabbats, zodiac signs, moon phases).
 *
 * Usage:
 *   npx tsx scripts/generate-bases.ts                  # generate all missing bases
 *   npx tsx scripts/generate-bases.ts --force           # regenerate everything
 *   npx tsx scripts/generate-bases.ts --only zodiac     # only zodiac bases
 *   npx tsx scripts/generate-bases.ts --only sabbat     # only sabbat bases
 *   npx tsx scripts/generate-bases.ts --only moon       # only moon phase bases
 *   npx tsx scripts/generate-bases.ts --only palette    # only palette bases
 *   npx tsx scripts/generate-bases.ts --key zodiac_pisces  # single specific key
 *   npx tsx scripts/generate-bases.ts --dry-run         # preview what would generate
 */

import * as fs from "fs";
import * as path from "path";
import { STYLES, type StyleKey } from "../src/lib/styles";

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

const BASE_IMAGE = path.resolve(__dirname, "..", "public/sammii-spellbound.png");
const OUTPUT_DIR = path.resolve(__dirname, "..", "public/coloured");
const IMAGE_API = "https://api.deepinfra.com/v1/openai/images/edits";
const IMAGE_MODEL = "black-forest-labs/FLUX.1-Kontext-dev";

// ---------------------------------------------------------------------------
// Style categories
// ---------------------------------------------------------------------------

const CATEGORIES: Record<string, StyleKey[]> = {
  palette: [
    "soft_watercolour", "celestial_glow", "sage_earth",
    "high_priestess", "fire_sorceress", "ocean_mystic", "shadow_ritual",
  ],
  sabbat: [
    "yule", "imbolc", "ostara", "beltane",
    "litha", "lammas", "mabon", "samhain",
  ],
  zodiac: [
    "zodiac_aries", "zodiac_taurus", "zodiac_gemini", "zodiac_cancer",
    "zodiac_leo", "zodiac_virgo", "zodiac_libra", "zodiac_scorpio",
    "zodiac_sagittarius", "zodiac_capricorn", "zodiac_aquarius", "zodiac_pisces",
  ],
  moon: [
    "moon_new", "moon_waxing_crescent", "moon_first_quarter", "moon_waxing_gibbous",
    "moon_full", "moon_waning_gibbous", "moon_last_quarter", "moon_waning_crescent",
  ],
};

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");

const onlyIdx = args.indexOf("--only");
const onlyCategory = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

const keyIdx = args.indexOf("--key");
const singleKey = keyIdx !== -1 ? args[keyIdx + 1] as StyleKey : null;

// ---------------------------------------------------------------------------
// Build generation queue
// ---------------------------------------------------------------------------

function getQueue(): StyleKey[] {
  if (singleKey) {
    if (!STYLES[singleKey]) {
      console.error(`Unknown style key: ${singleKey}`);
      console.error(`Available keys: ${Object.keys(STYLES).join(", ")}`);
      process.exit(1);
    }
    return [singleKey];
  }

  if (onlyCategory) {
    const keys = CATEGORIES[onlyCategory];
    if (!keys) {
      console.error(`Unknown category: ${onlyCategory}`);
      console.error(`Available categories: ${Object.keys(CATEGORIES).join(", ")}`);
      process.exit(1);
    }
    return keys;
  }

  // All styles
  return Object.keys(CATEGORIES).flatMap((cat) => CATEGORIES[cat]);
}

// ---------------------------------------------------------------------------
// Generate a single coloured base
// ---------------------------------------------------------------------------

async function generateBase(styleKey: StyleKey): Promise<boolean> {
  const style = STYLES[styleKey];
  const outputPath = path.join(OUTPUT_DIR, `${styleKey}.png`);

  if (!force && fs.existsSync(outputPath)) {
    console.log(`  [skip] ${styleKey} — already exists (use --force to regenerate)`);
    return true;
  }

  if (dryRun) {
    console.log(`  [dry-run] would generate: ${styleKey} → ${outputPath}`);
    return true;
  }

  const token = process.env.DEEPINFRA_API_TOKEN;
  if (!token) {
    console.error("  DEEPINFRA_API_TOKEN not set");
    return false;
  }

  console.log(`  Generating ${styleKey}...`);

  const imageData = fs.readFileSync(BASE_IMAGE);
  const blob = new Blob([imageData], { type: "image/png" });

  const form = new FormData();
  form.append("image", blob, "base.png");
  form.append("prompt", style.prompt);
  form.append("model", IMAGE_MODEL);
  form.append("n", "1");
  form.append("size", "1024x1024");

  const res = await fetch(IMAGE_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  API error for ${styleKey}: ${res.status} ${err}`);
    return false;
  }

  const json = await res.json();
  const entry = json.data?.[0];
  if (!entry) {
    console.error(`  No image data returned for ${styleKey}`);
    return false;
  }

  if (entry.b64_json) {
    fs.writeFileSync(outputPath, Buffer.from(entry.b64_json, "base64"));
  } else if (entry.url) {
    const img = await fetch(entry.url);
    fs.writeFileSync(outputPath, Buffer.from(await img.arrayBuffer()));
  } else {
    console.error(`  No image data in response for ${styleKey}`);
    return false;
  }

  console.log(`  ✓ ${styleKey} → ${outputPath}`);
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Ensure output dir exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  if (!fs.existsSync(BASE_IMAGE)) {
    console.error(`Base image not found: ${BASE_IMAGE}`);
    process.exit(1);
  }

  const queue = getQueue();

  console.log(`\nColoured Base Generator`);
  console.log(`======================`);
  console.log(`Base image: ${BASE_IMAGE}`);
  console.log(`Output dir: ${OUTPUT_DIR}`);
  console.log(`Queue: ${queue.length} styles`);
  if (force) console.log(`Mode: FORCE (regenerating all)`);
  if (dryRun) console.log(`Mode: DRY RUN`);
  console.log();

  // Show what we're generating by category
  for (const [cat, keys] of Object.entries(CATEGORIES)) {
    const inQueue = keys.filter((k) => queue.includes(k));
    if (inQueue.length === 0) continue;
    const existing = inQueue.filter((k) => fs.existsSync(path.join(OUTPUT_DIR, `${k}.png`)));
    console.log(`${cat}: ${inQueue.length} styles (${existing.length} existing${force ? ", will regenerate" : ""})`);
  }
  console.log();

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (const key of queue) {
    const outputPath = path.join(OUTPUT_DIR, `${key}.png`);
    if (!force && fs.existsSync(outputPath)) {
      skipped++;
      console.log(`  [skip] ${key}`);
      continue;
    }

    if (dryRun) {
      console.log(`  [dry-run] ${key} → ${path.basename(outputPath)}`);
      succeeded++;
      continue;
    }

    const ok = await generateBase(key);
    if (ok) succeeded++;
    else failed++;

    // Small delay between API calls to be nice
    if (queue.indexOf(key) < queue.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log();
  console.log(`Done: ${succeeded} generated, ${skipped} skipped, ${failed} failed`);
  console.log(`Total bases in ${OUTPUT_DIR}: ${fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith(".png")).length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
