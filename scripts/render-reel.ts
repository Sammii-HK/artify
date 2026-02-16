/**
 * Remotion Rendering Wrapper
 *
 * Server-side renderer for reel compositions.
 * Bundles the Remotion entry point (cached across multiple renders in one run)
 * and renders to h264 MP4 (Instagram-compatible).
 *
 * Images are converted to base64 data URIs so Remotion can load them
 * without needing them served via HTTP.
 */

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import * as path from "path";
import * as fs from "fs";
import sharp from "sharp";

// ---------------------------------------------------------------------------
// Bundle cache — reused across multiple renders in one pipeline run
// ---------------------------------------------------------------------------

let bundleLocationCache: string | null = null;

async function getBundle(): Promise<string> {
  if (bundleLocationCache) return bundleLocationCache;

  const entryPoint = path.resolve(__dirname, "remotion/Root.tsx");
  console.log(`    Bundling Remotion entry point...`);

  bundleLocationCache = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });

  console.log(`    Bundle ready`);
  return bundleLocationCache;
}

// ---------------------------------------------------------------------------
// Image path → data URI conversion
// ---------------------------------------------------------------------------

function toDataUri(filePath: string): string {
  if (filePath.startsWith("data:")) return filePath; // already a data URI
  if (!fs.existsSync(filePath)) {
    console.warn(`    Image not found, skipping: ${filePath}`);
    return filePath;
  }
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === ".jpg" || ext === ".jpeg"
      ? "image/jpeg"
      : ext === ".webp"
        ? "image/webp"
        : "image/png";
  const b64 = fs.readFileSync(filePath).toString("base64");
  return `data:${mime};base64,${b64}`;
}

/**
 * Convert any local file paths in props to base64 data URIs
 * so Remotion's <Img> can render them without an HTTP server.
 * Also extracts color palette from the hook image for CarouselRecap.
 */
async function resolveImageProps(
  compositionId: string,
  props: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const resolved = { ...props };

  if ((compositionId === "KenBurns" || compositionId === "KenBurnsStory") && typeof resolved.imagePath === "string") {
    console.log(`    Encoding image as data URI...`);
    resolved.imagePath = toDataUri(resolved.imagePath as string);
  }

  // AnimatedTextSlide — all text props, no image resolution needed

  if (compositionId === "CarouselRecap" && Array.isArray(resolved.slides)) {
    // Extract palette from hook image before converting to data URI
    const hookPath = (resolved.slides as string[])[0];
    if (hookPath && !resolved.palette) {
      const palette = await extractPalette(hookPath);
      if (palette) resolved.palette = palette;
    }

    console.log(`    Encoding ${(resolved.slides as string[]).length} slides as data URIs...`);
    resolved.slides = (resolved.slides as string[]).map(toDataUri);
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// Palette extraction — dominant colors from the hook image
// ---------------------------------------------------------------------------

export interface ImagePalette {
  dominant: string;    // most frequent color — used for card bg
  accent: string;      // vibrant accent — used for headings/lines
  light: string;       // lightest tone — used for body text
  muted: string;       // muted mid-tone — used for footer/subtle elements
}

/**
 * Extract a 4-color palette from an image using sharp's dominant-color stats.
 * Resizes to a tiny grid, extracts unique colors, and picks roles by luminance.
 */
async function extractPalette(imagePath: string): Promise<ImagePalette | null> {
  try {
    const filePath = imagePath.startsWith("data:")
      ? null
      : imagePath;
    if (!filePath || !fs.existsSync(filePath)) return null;

    // Downscale to 8x8 to get dominant color regions
    const { data, info } = await sharp(filePath)
      .resize(8, 8, { fit: "cover" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Collect all pixel colors
    const pixels: { r: number; g: number; b: number }[] = [];
    for (let i = 0; i < data.length; i += 3) {
      pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }

    // Sort by luminance
    const lum = (c: { r: number; g: number; b: number }) =>
      0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
    const sat = (c: { r: number; g: number; b: number }) => {
      const max = Math.max(c.r, c.g, c.b);
      const min = Math.min(c.r, c.g, c.b);
      return max === 0 ? 0 : (max - min) / max;
    };

    pixels.sort((a, b) => lum(a) - lum(b));

    // Pick roles: darkest quarter → dominant (card bg), most saturated → accent,
    // lightest → light text, middle → muted
    const quarter = Math.floor(pixels.length / 4);
    const darkGroup = pixels.slice(0, quarter);
    const midGroup = pixels.slice(quarter, quarter * 3);
    const lightGroup = pixels.slice(quarter * 3);

    // Dark dominant — pick the darkest with some saturation
    const dominant = darkGroup.sort((a, b) => sat(b) - sat(a))[0] || pixels[0];

    // Accent — most saturated overall
    const accent = [...pixels].sort((a, b) => sat(b) - sat(a))[0];

    // Light — brightest pixel
    const light = lightGroup[lightGroup.length - 1] || pixels[pixels.length - 1];

    // Muted — mid-range, moderate saturation
    const muted = midGroup[Math.floor(midGroup.length / 2)] || pixels[Math.floor(pixels.length / 2)];

    const toHex = (c: { r: number; g: number; b: number }) =>
      `#${[c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

    // Ensure dark dominant is actually dark enough for card bg (darken if needed)
    const darkenedDominant = {
      r: Math.floor(dominant.r * 0.5),
      g: Math.floor(dominant.g * 0.5),
      b: Math.floor(dominant.b * 0.5),
    };

    // Ensure light is light enough for text (brighten if needed)
    const brightenedLight = {
      r: Math.min(255, light.r + Math.floor((255 - light.r) * 0.4)),
      g: Math.min(255, light.g + Math.floor((255 - light.g) * 0.4)),
      b: Math.min(255, light.b + Math.floor((255 - light.b) * 0.4)),
    };

    // Boost accent saturation slightly
    const accentMax = Math.max(accent.r, accent.g, accent.b);
    const boostedAccent = accentMax > 0
      ? {
          r: Math.min(255, Math.floor(accent.r * (200 / accentMax))),
          g: Math.min(255, Math.floor(accent.g * (200 / accentMax))),
          b: Math.min(255, Math.floor(accent.b * (200 / accentMax))),
        }
      : accent;

    const palette: ImagePalette = {
      dominant: toHex(darkenedDominant),
      accent: toHex(boostedAccent),
      light: toHex(brightenedLight),
      muted: toHex(muted),
    };

    console.log(`    Palette: dominant=${palette.dominant} accent=${palette.accent} light=${palette.light} muted=${palette.muted}`);
    return palette;
  } catch (err) {
    console.warn(`    Palette extraction failed, using defaults:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Render function
// ---------------------------------------------------------------------------

export interface RenderReelOptions {
  compositionId: "CarouselRecap" | "KenBurns" | "KenBurnsStory" | "AnimatedTextSlide";
  props: Record<string, unknown>;
  outputPath: string;
}

/**
 * Render a Remotion composition to an h264 MP4 file.
 *
 * @returns true if rendering succeeded
 */
export async function renderReel({
  compositionId,
  props,
  outputPath,
}: RenderReelOptions): Promise<boolean> {
  try {
    const bundleLocation = await getBundle();
    const resolvedProps = await resolveImageProps(compositionId, props);

    console.log(`    Selecting composition: ${compositionId}`);
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps: resolvedProps,
    });

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    console.log(`    Rendering ${composition.durationInFrames} frames at ${composition.fps}fps...`);
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: resolvedProps,
    });

    console.log(`    Render complete: ${outputPath}`);
    return true;
  } catch (err) {
    console.error(`    Remotion render failed:`, err);
    return false;
  }
}
