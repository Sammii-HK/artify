#!/usr/bin/env npx tsx
/**
 * Generate Image Bank — seeds the bank with starter illustrations.
 *
 * Generates 8 moon phase scenes + 5 iconic tarot cards = 13 images.
 *
 * Usage:
 *   npx tsx scripts/generate-image-bank.ts
 *   npx tsx scripts/generate-image-bank.ts --dry-run
 */

import * as fs from "fs";
import * as path from "path";
import { generateImage, getBaseForPalette } from "../src/lib/pipeline";
import { SCENES } from "../src/lib/scenes";
import { buildScenePrompt } from "../src/lib/scenes";
import { saveToBank, tagsFromSceneKey } from "./image-bank";

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
// Scenes to generate
// ---------------------------------------------------------------------------

const BANK_SCENES = [
  // 8 moon phase scenes
  "full_moon",
  "new_moon_ritual",
  "moon_phase_checkin",
  "moon_energy_update",
  "eclipse_ritual",
  "moon_waxing_ritual",
  "moon_waning_release",
  "evening_wind_down",

  // 5 iconic tarot cards
  "tarot_00_fool",
  "tarot_01_magician",
  "tarot_02_high_priestess",
  "tarot_17_star",
  "tarot_18_moon",
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const tmpDir = path.resolve("public/image-bank/.tmp");

  console.log("\nIMAGE BANK GENERATOR");
  console.log("=".repeat(50));
  console.log(`  Scenes to generate: ${BANK_SCENES.length}`);
  console.log(`  Dry run: ${dryRun}`);
  console.log();

  if (dryRun) {
    for (const key of BANK_SCENES) {
      const scene = SCENES[key];
      if (!scene) {
        console.log(`  [SKIP] ${key} — scene not found`);
        continue;
      }
      const tags = tagsFromSceneKey(key);
      console.log(`  [PLAN] ${key} — ${scene.label} (palette: ${scene.palette}, tags: ${tags.join(", ")})`);
    }
    console.log(`\n  Total: ${BANK_SCENES.length} images planned`);
    return;
  }

  fs.mkdirSync(tmpDir, { recursive: true });

  let generated = 0;
  let failed = 0;

  for (const key of BANK_SCENES) {
    const scene = SCENES[key];
    if (!scene) {
      console.log(`  [SKIP] ${key} — scene not found`);
      failed++;
      continue;
    }

    const prompt = buildScenePrompt(scene);
    const basePath = getBaseForPalette(scene.palette);
    const tmpPath = path.join(tmpDir, `${key}.png`);

    console.log(`  Generating: ${key} (${scene.label})...`);
    const ok = await generateImage(basePath, prompt, tmpPath, false);

    if (ok) {
      saveToBank(tmpPath, key);
      generated++;
      console.log(`    Saved to bank`);
    } else {
      failed++;
      console.log(`    FAILED`);
    }
  }

  // Clean up tmp
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log("\n" + "=".repeat(50));
  console.log(`  Generated: ${generated}`);
  console.log(`  Failed: ${failed}`);
  console.log("=".repeat(50) + "\n");
}

main().catch((err) => {
  console.error("Image bank generation failed:", err);
  process.exit(1);
});
