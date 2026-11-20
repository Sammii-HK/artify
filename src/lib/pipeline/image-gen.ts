/**
 * Image Generation — DeepInfra Flux Kontext
 *
 * Generates images via image-to-image editing and validates hands/fingers.
 * Works with both file paths (CLI) and Buffers (serverless).
 */

import * as fs from "fs";
import type { PALETTES } from "../scenes.ts";
import type { StyleKey } from "../styles.ts";
import type { AstroContext } from "../astro.ts";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const IMAGE_API = "https://api.deepinfra.com/v1/openai/images/edits";
const IMAGE_MODEL = "black-forest-labs/FLUX.1-Kontext-dev";
const LLM_API = "https://api.deepinfra.com/v1/openai/chat/completions";
const VISION_MODEL = "meta-llama/Llama-3.2-11B-Vision-Instruct";

function getToken(): string {
  return process.env.DEEPINFRA_API_TOKEN ?? "";
}

// ---------------------------------------------------------------------------
// Palette → Style mapping
// ---------------------------------------------------------------------------

export const PALETTE_TO_STYLE: Record<keyof typeof PALETTES, StyleKey> = {
  celestial: "celestial_glow",
  mystic: "shadow_ritual",
  earthy: "sage_earth",
  oceanic: "ocean_mystic",
  solar: "fire_sorceress",
  cream: "soft_watercolour",
  indigo: "high_priestess",
};

// ---------------------------------------------------------------------------
// Zodiac sign → style key
// ---------------------------------------------------------------------------

const ZODIAC_TO_STYLE: Record<string, StyleKey> = {
  Aries: "zodiac_aries",
  Taurus: "zodiac_taurus",
  Gemini: "zodiac_gemini",
  Cancer: "zodiac_cancer",
  Leo: "zodiac_leo",
  Virgo: "zodiac_virgo",
  Libra: "zodiac_libra",
  Scorpio: "zodiac_scorpio",
  Sagittarius: "zodiac_sagittarius",
  Capricorn: "zodiac_capricorn",
  Aquarius: "zodiac_aquarius",
  Pisces: "zodiac_pisces",
};

// ---------------------------------------------------------------------------
// Moon phase → style key
// ---------------------------------------------------------------------------

const MOON_TO_STYLE: Record<string, StyleKey> = {
  "New Moon": "moon_new",
  "Waxing Crescent": "moon_waxing_crescent",
  "First Quarter": "moon_first_quarter",
  "Waxing Gibbous": "moon_waxing_gibbous",
  "Full Moon": "moon_full",
  "Waning Gibbous": "moon_waning_gibbous",
  "Last Quarter": "moon_last_quarter",
  "Waning Crescent": "moon_waning_crescent",
};

// ---------------------------------------------------------------------------
// Sabbat → style key
// ---------------------------------------------------------------------------

const SABBAT_TO_STYLE: Record<string, StyleKey> = {
  Yule: "yule",
  Imbolc: "imbolc",
  Ostara: "ostara",
  Beltane: "beltane",
  Litha: "litha",
  Lammas: "lammas",
  Mabon: "mabon",
  Samhain: "samhain",
};

// ---------------------------------------------------------------------------
// Base image helpers
// ---------------------------------------------------------------------------

const BASE_IMAGE = "public/sammii-spellbound.png";
const COLOURED_DIR = "public/coloured";

/** Check if a coloured base exists for a style key */
function baseExists(styleKey: StyleKey): boolean {
  return fs.existsSync(`${COLOURED_DIR}/${styleKey}.png`);
}

/** Return the path to a cached coloured image for a palette (legacy) */
export function getBaseForPalette(palette: keyof typeof PALETTES): string {
  const styleKey = PALETTE_TO_STYLE[palette];
  const cached = `${COLOURED_DIR}/${styleKey}.png`;
  if (fs.existsSync(cached)) return cached;
  return BASE_IMAGE;
}

/**
 * Context-aware base selection.
 *
 * Priority order (uses the most specific available base):
 * 1. Sabbat base (if near a sabbat and base exists)
 * 2. Moon phase base (if base exists) — for moon/night-themed scenes
 * 3. Zodiac season base (if base exists)
 * 4. Palette base (original fallback)
 *
 * The `sceneKey` is used to decide whether moon phase is relevant —
 * moon/evening/night scenes prefer moon bases, other scenes prefer zodiac.
 */
export function getBaseForContext(
  palette: keyof typeof PALETTES,
  astro: AstroContext,
  sceneKey?: string,
): string {
  // 1. Sabbat takes highest priority (rare, seasonal, special)
  if (astro.sabbat) {
    const sabbatStyle = SABBAT_TO_STYLE[astro.sabbat.name];
    if (sabbatStyle && baseExists(sabbatStyle)) {
      return `${COLOURED_DIR}/${sabbatStyle}.png`;
    }
  }

  // 2. Moon base for moon-themed scenes
  const moonScenes = new Set([
    "moon_phase_checkin",
    "moon_energy_update",
    "full_moon",
    "new_moon_ritual",
    "eclipse_ritual",
    "evening_wind_down",
    "shadow_work",
    "moon_waxing_ritual",
    "moon_waning_release",
  ]);
  if (sceneKey && moonScenes.has(sceneKey)) {
    const moonStyle = MOON_TO_STYLE[astro.moon.name];
    if (moonStyle && baseExists(moonStyle)) {
      return `${COLOURED_DIR}/${moonStyle}.png`;
    }
  }

  // 3. Zodiac season base
  const zodiacStyle = ZODIAC_TO_STYLE[astro.zodiac.sign];
  if (zodiacStyle && baseExists(zodiacStyle)) {
    return `${COLOURED_DIR}/${zodiacStyle}.png`;
  }

  // 4. Palette fallback
  return getBaseForPalette(palette);
}

// ---------------------------------------------------------------------------
// Image generation (file-based — for CLI and Hetzner scripts)
// ---------------------------------------------------------------------------

export type ValidationStatus = "passed" | "failed" | "skipped" | "error";
export interface ValidationResult {
  status: ValidationStatus;
  pass: boolean;
  reason: string;
}
export interface ImageGenerationResult {
  status: "accepted" | "unchecked" | "failed" | "needs-review";
  outputPath: string | null;
  validation: ValidationResult;
  attempts: number;
  reason: string;
}

interface ImageRuntime {
  fetch: typeof fetch;
  token: () => string;
  readImage: (path: string) => Buffer | null;
  writeImage: (path: string, data: Buffer) => void;
}

const validation = (
  status: ValidationStatus,
  reason: string,
): ValidationResult => ({
  status,
  pass: status === "passed",
  reason,
});

/** Injected I/O lets failure and retry behaviour be tested without a provider call. */
export function createImagePipeline(runtime: ImageRuntime) {
  async function validateBuffer(data: Buffer): Promise<ValidationResult> {
    const token = runtime.token();
    if (!token)
      return validation("skipped", "No validation credential available.");
    try {
      const response = await runtime.fetch(LLM_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: VISION_MODEL,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${data.toString("base64")}`,
                  },
                },
                {
                  type: "text",
                  text: "Look at the hands in this illustration. For each visible hand, count the fingers. Does every hand have exactly 5 fingers? Reply with only PASS or FAIL followed by a brief reason.",
                },
              ],
            },
          ],
          max_tokens: 100,
          temperature: 0,
        }),
      });
      if (!response.ok)
        return validation(
          "error",
          `Validation provider returned HTTP ${response.status}.`,
        );
      const json = await response.json();
      const reply = json.choices?.[0]?.message?.content;
      if (typeof reply !== "string" || !/^(PASS|FAIL)\b/i.test(reply.trim())) {
        return validation(
          "error",
          "Validation provider did not return a recognisable verdict.",
        );
      }
      return validation(
        /^PASS\b/i.test(reply.trim()) ? "passed" : "failed",
        reply.trim(),
      );
    } catch {
      return validation("error", "Validation could not complete.");
    }
  }

  async function validateFile(imagePath: string): Promise<ValidationResult> {
    const data = runtime.readImage(imagePath);
    return data
      ? validateBuffer(data)
      : validation("skipped", "No image available to validate.");
  }

  async function generate(
    baseImagePath: string,
    prompt: string,
    outputPath: string,
    validate = true,
  ): Promise<ImageGenerationResult> {
    let attempts = 0;
    let check = validation(
      "skipped",
      validate
        ? "Generation has not completed."
        : "Validation explicitly disabled.",
    );
    const fail = (
      reason: string,
      status: "failed" | "needs-review" = "failed",
    ): ImageGenerationResult => ({
      status,
      outputPath: null,
      validation: check,
      attempts,
      reason,
    });
    const token = runtime.token();
    if (!token) return fail("No generation credential available.");
    const source = runtime.readImage(baseImagePath);
    if (!source) return fail("Base image is unavailable.");

    for (let attempt = 0; attempt < (validate ? 2 : 1); attempt++) {
      attempts++;
      try {
        const form = new FormData();
        form.append(
          "image",
          new Blob([new Uint8Array(source)], { type: "image/png" }),
          "base.png",
        );
        form.append("prompt", prompt);
        form.append("model", IMAGE_MODEL);
        form.append("n", "1");
        form.append("size", "1024x1024");
        const response = await runtime.fetch(IMAGE_API, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        if (!response.ok)
          return fail(
            `Image provider returned HTTP ${response.status}${attempt ? " on retry" : ""}.`,
          );
        const json = await response.json();
        const image = json.data?.[0];
        let candidate: Buffer;
        if (typeof image?.b64_json === "string" && image.b64_json.length)
          candidate = Buffer.from(image.b64_json, "base64");
        else if (typeof image?.url === "string" && image.url) {
          const download = await runtime.fetch(image.url);
          if (!download.ok)
            return fail(`Image download returned HTTP ${download.status}.`);
          candidate = Buffer.from(await download.arrayBuffer());
        } else
          return fail(
            `Image provider returned no image${attempt ? " on retry" : ""}.`,
          );
        if (!candidate.length)
          return fail("Image provider returned an empty image.");
        if (validate) {
          check = await validateBuffer(candidate);
          if (check.status === "failed") {
            if (attempt === 0) continue;
            return fail("Both generated candidates failed validation.");
          }
          if (check.status !== "passed")
            return fail(
              "Image validation is incomplete; this candidate was not accepted.",
              "needs-review",
            );
        }
        // Do not publish or overwrite an output until this candidate is accepted,
        // or validation has been explicitly disabled. Rejected candidates never
        // replace a previous file and no existing file is deleted.
        runtime.writeImage(outputPath, candidate);
        return {
          status: validate ? "accepted" : "unchecked",
          outputPath,
          validation: check,
          attempts,
          reason: validate
            ? "Generated and validation passed."
            : "Generated without validation.",
        };
      } catch {
        return fail(
          attempt
            ? "Image retry could not complete."
            : "Image generation could not complete.",
        );
      }
    }
    return fail("Image generation did not produce an accepted candidate.");
  }
  return { generate, validateFile };
}

function defaultPipeline() {
  return createImagePipeline({
    fetch: globalThis.fetch,
    token: getToken,
    readImage: (path) => (fs.existsSync(path) ? fs.readFileSync(path) : null),
    writeImage: (path, data) => fs.writeFileSync(path, data),
  });
}

export function generateImage(
  baseImagePath: string,
  prompt: string,
  outputPath: string,
  validate = true,
): Promise<ImageGenerationResult> {
  return defaultPipeline().generate(
    baseImagePath,
    prompt,
    outputPath,
    validate,
  );
}

export function validateHands(imagePath: string): Promise<ValidationResult> {
  return defaultPipeline().validateFile(imagePath);
}
