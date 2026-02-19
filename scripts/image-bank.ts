/**
 * Image Bank — reusable illustration storage for story backgrounds
 *
 * Maintains a bank of generated illustrations that can be reused
 * as story backgrounds, avoiding fresh generation or plain colours.
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BANK_DIR = path.resolve(__dirname, "../public/image-bank");
const INDEX_PATH = path.join(BANK_DIR, "index.json");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BankEntry {
  path: string;
  sceneKey: string;
  tags: string[];
  createdAt: string;
}

interface BankIndex {
  entries: BankEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDirs() {
  for (const sub of ["moon", "tarot", "scenes"]) {
    fs.mkdirSync(path.join(BANK_DIR, sub), { recursive: true });
  }
}

function readIndex(): BankIndex {
  if (!fs.existsSync(INDEX_PATH)) return { entries: [] };
  try {
    return JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
  } catch {
    return { entries: [] };
  }
}

function writeIndex(index: BankIndex) {
  ensureDirs();
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));
}

/** Derive tags from a scene key */
export function tagsFromSceneKey(sceneKey: string): string[] {
  const tags: string[] = [];
  if (sceneKey.startsWith("tarot_")) tags.push("tarot");
  if (sceneKey.startsWith("moon_") || sceneKey.includes("moon") || sceneKey === "full_moon" || sceneKey === "new_moon_ritual" || sceneKey === "eclipse_ritual" || sceneKey === "evening_wind_down") tags.push("moon");
  if (sceneKey.startsWith("rune_")) tags.push("rune");
  if (sceneKey.includes("crystal")) tags.push("crystal");
  if (sceneKey.includes("spell") || sceneKey.includes("candle") || sceneKey.includes("jar_spell")) tags.push("spell");
  if (sceneKey.includes("zodiac") || sceneKey.includes("season")) tags.push("zodiac");
  if (tags.length === 0) tags.push("scenes");
  return tags;
}

/** Determine subdirectory for a scene key */
function subdirForTags(tags: string[]): string {
  if (tags.includes("moon")) return "moon";
  if (tags.includes("tarot")) return "tarot";
  return "scenes";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Pick an image from the bank matching any of the given tags.
 * Uses a seeded index for variety. Returns null if bank is empty.
 */
export function pickFromBank(tags: string[], seed: number): string | null {
  const index = readIndex();
  if (index.entries.length === 0) return null;

  // Filter entries that match at least one tag
  const matching = index.entries.filter((e) =>
    e.tags.some((t) => tags.includes(t))
  );

  const pool = matching.length > 0 ? matching : index.entries;
  const entry = pool[Math.abs(seed) % pool.length];

  // Verify file exists
  const absPath = path.resolve(BANK_DIR, "..", "..", entry.path);
  if (!fs.existsSync(absPath)) return null;

  return absPath;
}

/**
 * Save a generated illustration into the bank for future reuse.
 * Copies the file into the appropriate subdirectory and updates index.json.
 */
export function saveToBank(imagePath: string, sceneKey: string, tags?: string[]): void {
  const resolvedTags = tags ?? tagsFromSceneKey(sceneKey);
  const subdir = subdirForTags(resolvedTags);

  ensureDirs();

  const timestamp = Date.now();
  const filename = `${sceneKey}_${timestamp}.png`;
  const destRelative = `public/image-bank/${subdir}/${filename}`;
  const destAbsolute = path.resolve(BANK_DIR, subdir, filename);

  try {
    fs.copyFileSync(imagePath, destAbsolute);
  } catch (err) {
    console.error(`  Failed to save to bank: ${err}`);
    return;
  }

  const index = readIndex();
  index.entries.push({
    path: destRelative,
    sceneKey,
    tags: resolvedTags,
    createdAt: new Date().toISOString(),
  });
  writeIndex(index);
}
