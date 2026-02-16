#!/usr/bin/env npx tsx
/**
 * Standalone reel test — no API keys needed.
 * Uses existing local images + manifest text data to test Remotion rendering.
 *
 * Usage:
 *   npx tsx scripts/test-reels.ts              # run all tests
 *   npx tsx scripts/test-reels.ts kenburns     # just Ken Burns
 *   npx tsx scripts/test-reels.ts carousel     # just carousel recap
 */

import * as fs from "fs";
import * as path from "path";
import { renderReel } from "./render-reel";

const OUTPUT_DIR = path.resolve(__dirname, "../public/content/test-reels");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findImages(dir: string, pattern: RegExp, max = 5): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => pattern.test(f))
    .slice(0, max)
    .map((f) => path.join(dir, f));
}

interface ManifestSlide {
  type: string;
  image: string | null;
  textContent?: { heading: string; body: string[]; footer?: string };
}

interface ManifestPost {
  format: string;
  slides: ManifestSlide[];
  label?: string;
  contentType?: string;
}

interface ManifestDay {
  posts: ManifestPost[];
}

interface Manifest {
  days: ManifestDay[];
}

/** Find the first carousel post with slides + text in any manifest */
function findCarouselData(): {
  slides: string[];
  slideTexts: ({ heading: string; body: string[]; footer?: string } | null)[];
  heading: string;
} | null {
  const contentDir = path.resolve(__dirname, "../public/content");
  if (!fs.existsSync(contentDir)) return null;

  const weekDirs = fs
    .readdirSync(contentDir)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort()
    .reverse();

  for (const wd of weekDirs) {
    const manifestPath = path.join(contentDir, wd, "content.json");
    if (!fs.existsSync(manifestPath)) continue;

    const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    for (const day of manifest.days) {
      for (const post of day.posts) {
        if (post.format !== "carousel" || post.slides.length === 0) continue;

        const slides: string[] = [];
        const slideTexts: ({ heading: string; body: string[]; footer?: string } | null)[] = [];

        for (const s of post.slides) {
          // s.image is like "/content/2026-02-16/file.png" — strip leading /
          const relPath = s.image?.replace(/^\//, "") ?? null;
          const imgPath = relPath
            ? path.resolve(__dirname, "..", "public", relPath)
            : null;

          if (imgPath && fs.existsSync(imgPath)) {
            slides.push(imgPath);
            slideTexts.push(s.textContent ?? null);
          } else if (s.textContent) {
            // Text slide without resolved image — still include it, use empty string
            slides.push("");
            slideTexts.push(s.textContent);
          }
        }

        if (slides.length > 0) {
          return {
            slides,
            slideTexts,
            heading: post.label ?? post.contentType?.replace(/_/g, " ") ?? "Carousel",
          };
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function testKenBurns() {
  console.log("\n" + "=".repeat(60));
  console.log("TEST: Ken Burns Reel (with bokeh + sparkles)");
  console.log("=".repeat(60));

  const candidates = [
    path.resolve(__dirname, "../public/content/singles/kitchen_witch.png"),
    path.resolve(__dirname, "../public/content/singles/amethyst_guide.png"),
    path.resolve(__dirname, "../public/sammii-spellbound.png"),
  ];

  const imagePath = candidates.find((p) => fs.existsSync(p));
  if (!imagePath) {
    console.error("No test image found.");
    return false;
  }

  console.log(`  Source image: ${path.basename(imagePath)}`);

  const outputPath = path.join(OUTPUT_DIR, "test_kenburns.mp4");
  const ok = await renderReel({
    compositionId: "KenBurns",
    props: {
      imagePath,
      overlayText: "Kitchen Witch Essentials",
      bodyLines: [
        "Rosemary on your windowsill protects the home",
        "Stir clockwise to draw energy in",
        "Salt across doorways blocks negativity",
      ],
      cta: "Save this for your next kitchen ritual",
    },
    outputPath,
  });

  if (ok) {
    const stat = fs.statSync(outputPath);
    console.log(`\n  Output: ${outputPath}`);
    console.log(`  Size: ${(stat.size / 1024 / 1024).toFixed(1)}MB`);
    console.log(`  Open: open "${outputPath}"`);
  }
  return ok;
}

async function testCarouselRecap() {
  console.log("\n" + "=".repeat(60));
  console.log("TEST: Carousel Recap Reel (with animated text)");
  console.log("=".repeat(60));

  const data = findCarouselData();
  if (!data) {
    console.error("No carousel data found in any manifest. Run generate first.");
    return false;
  }

  console.log(`  Heading: "${data.heading}"`);
  console.log(`  Slides: ${data.slides.length}`);
  for (let i = 0; i < data.slides.length; i++) {
    const text = data.slideTexts[i];
    const label = text ? `"${text.heading}" (${text.body.length} lines)` : "(static image)";
    console.log(`    ${i + 1}. ${label}`);
  }

  const outputPath = path.join(OUTPUT_DIR, "test_carousel_recap.mp4");
  const ok = await renderReel({
    compositionId: "CarouselRecap",
    props: {
      slides: data.slides,
      slideTexts: data.slideTexts,
      heading: data.heading,
    },
    outputPath,
  });

  if (ok) {
    const stat = fs.statSync(outputPath);
    console.log(`\n  Output: ${outputPath}`);
    console.log(`  Size: ${(stat.size / 1024 / 1024).toFixed(1)}MB`);
    console.log(`  Open: open "${outputPath}"`);
  }
  return ok;
}

// ---------------------------------------------------------------------------
// Story tests
// ---------------------------------------------------------------------------

async function testKenBurnsStory() {
  console.log("\n" + "=".repeat(60));
  console.log("TEST: Ken Burns Story (7s, 210 frames)");
  console.log("=".repeat(60));

  const candidates = [
    path.resolve(__dirname, "../public/content/singles/kitchen_witch.png"),
    path.resolve(__dirname, "../public/content/singles/amethyst_guide.png"),
    path.resolve(__dirname, "../public/sammii-spellbound.png"),
  ];

  const imagePath = candidates.find((p) => fs.existsSync(p));
  if (!imagePath) {
    console.error("No test image found.");
    return false;
  }

  console.log(`  Source image: ${path.basename(imagePath)}`);

  const outputPath = path.join(OUTPUT_DIR, "test_kenburns_story.mp4");
  const ok = await renderReel({
    compositionId: "KenBurnsStory",
    props: {
      imagePath,
      overlayText: "Daily Oracle",
    },
    outputPath,
  });

  if (ok) {
    const stat = fs.statSync(outputPath);
    console.log(`\n  Output: ${outputPath}`);
    console.log(`  Size: ${(stat.size / 1024 / 1024).toFixed(1)}MB`);
    console.log(`  Open: open "${outputPath}"`);
  }
  return ok;
}

async function testAnimatedTextSlide() {
  console.log("\n" + "=".repeat(60));
  console.log("TEST: Animated Text Slides (6s, 180 frames)");
  console.log("=".repeat(60));

  const templates: { template: string; heading: string; body: string[]; footer: string; cta: string }[] = [
    {
      template: "info",
      heading: "Moon Water 101",
      body: [
        "Set your water out under the full moon",
        "Use a clear glass or crystal bowl",
        "Charge for at least 4 hours",
        "Use within 3 days for best potency",
      ],
      footer: "Save this for the next full moon",
      cta: "DM me your moon water tips!",
    },
    {
      template: "list",
      heading: "Protection Herbs",
      body: [
        "Rosemary — purification & clarity",
        "Sage — cleansing negative energy",
        "Lavender — peace & calm",
        "Bay leaf — wish manifestation",
      ],
      footer: "Which is your go-to?",
      cta: "Screenshot & share!",
    },
    {
      template: "numbered",
      heading: "Candle Spell Steps",
      body: [
        "Choose a candle colour for your intention",
        "Carve your wish into the wax",
        "Anoint with essential oil, top to bottom",
        "Light and focus your intention for 5 minutes",
      ],
      footer: "Best during a waxing moon",
      cta: "Screenshot & share!",
    },
    {
      template: "journal",
      heading: "Gratitude Prompts",
      body: [
        "What magic did you notice in your day today?",
        "Which element felt most present this week?",
        "What are you ready to release under this moon?",
      ],
      footer: "Your journal is your grimoire",
      cta: "Reply with yours!",
    },
  ];

  let allOk = true;

  for (const t of templates) {
    console.log(`\n  Template: ${t.template}`);
    const outputPath = path.join(OUTPUT_DIR, `test_animated_text_${t.template}.mp4`);
    const ok = await renderReel({
      compositionId: "AnimatedTextSlide",
      props: {
        heading: t.heading,
        body: t.body,
        footer: t.footer,
        template: t.template,
        cta: t.cta,
      },
      outputPath,
    });

    if (ok) {
      const stat = fs.statSync(outputPath);
      console.log(`  Output: ${outputPath}`);
      console.log(`  Size: ${(stat.size / 1024 / 1024).toFixed(1)}MB`);
    } else {
      allOk = false;
    }
  }

  if (allOk) {
    console.log(`\n  All 4 templates rendered. Open: open ${OUTPUT_DIR}`);
  }
  return allOk;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const filter = process.argv[2];
  let passed = 0;
  let failed = 0;

  if (!filter || filter === "kenburns") {
    (await testKenBurns()) ? passed++ : failed++;
  }

  if (!filter || filter === "carousel") {
    (await testCarouselRecap()) ? passed++ : failed++;
  }

  if (!filter || filter === "story") {
    (await testKenBurnsStory()) ? passed++ : failed++;
    (await testAnimatedTextSlide()) ? passed++ : failed++;
  }

  console.log("\n" + "=".repeat(60));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(60));

  if (passed > 0) {
    console.log(`\nOpen output: open ${OUTPUT_DIR}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
