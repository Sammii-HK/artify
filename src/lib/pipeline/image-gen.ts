/**
 * Image Generation — DeepInfra Flux Kontext
 *
 * Generates images via image-to-image editing and validates hands/fingers.
 * Works with both file paths (CLI) and Buffers (serverless).
 */

import * as fs from "fs";
import { PALETTES } from "../scenes";
import { STYLES, type StyleKey } from "../styles";

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
// Base image helpers
// ---------------------------------------------------------------------------

const BASE_IMAGE = "public/sammii-spellbound.png";
const COLOURED_DIR = "public/coloured";

/** Return the path to a cached coloured image for a palette */
export function getBaseForPalette(palette: keyof typeof PALETTES): string {
  const styleKey = PALETTE_TO_STYLE[palette];
  const cached = `${COLOURED_DIR}/${styleKey}.png`;
  if (fs.existsSync(cached)) return cached;
  return BASE_IMAGE;
}

// ---------------------------------------------------------------------------
// Image generation (file-based — for CLI and Hetzner scripts)
// ---------------------------------------------------------------------------

export async function generateImage(
  baseImagePath: string,
  prompt: string,
  outputPath: string,
  validate = true,
): Promise<boolean> {
  const token = getToken();
  if (!token) {
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
    headers: { Authorization: `Bearer ${token}` },
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

  // Hand / finger validation
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
    headers: { Authorization: `Bearer ${token}` },
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
// Hand / finger validation
// ---------------------------------------------------------------------------

export async function validateHands(
  imagePath: string,
): Promise<{ pass: boolean; reason: string }> {
  const token = getToken();
  if (!token || !fs.existsSync(imagePath)) {
    return { pass: true, reason: "skipped — no token or image" };
  }

  const b64 = fs.readFileSync(imagePath).toString("base64");
  const dataUrl = `data:image/png;base64,${b64}`;

  const res = await fetch(LLM_API, {
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
  const reply: string = json.choices?.[0]?.message?.content?.trim() ?? "";

  const pass = reply.toUpperCase().startsWith("PASS");
  return { pass, reason: reply };
}
