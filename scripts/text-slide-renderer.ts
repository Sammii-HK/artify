#!/usr/bin/env npx tsx
/**
 * Text Slide Renderer — SVG-to-PNG via sharp
 *
 * Generates branded text slides for carousel posts.
 * 1080x1350px (4:5 portrait for Instagram feed).
 *
 * Templates: info card, list card, numbered steps, journal prompts
 * Styles: A (solid bg), B (textured bg)
 *
 * Usage:
 *   npx tsx scripts/text-slide-renderer.ts test
 */

import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Brand constants
// ---------------------------------------------------------------------------

const WIDTH = 1080;
const HEIGHT = 1350;

const COLORS = {
  midnightPlum: "#4A3352",
  dustyRose: "#C4929E",
  warmCream: "#F5EDE3",
  softGold: "#D4AF73",
  lavender: "#B8A9C9",
  sage: "#A8B5A0",
} as const;

const HEADER_FONT = "Cormorant Garamond, Georgia, serif";
const BODY_FONT = "Helvetica, Arial, sans-serif";
const WATERMARK = "@sammiispellbound";

// ---------------------------------------------------------------------------
// SVG helpers
// ---------------------------------------------------------------------------

/** Strip unicode symbols that SVG fonts can't render (zodiac, runes, etc.) */
function stripUnsupportedChars(str: string): string {
  // Remove characters outside basic Latin, Latin-1 Supplement, and common punctuation
  // Keep: ASCII, accented chars, em/en dashes, curly quotes, common symbols
  return str.replace(/[^\u0000-\u024F\u2010-\u2027\u2030-\u205E\u2070-\u209F\u20A0-\u20CF\u2100-\u214F]/g, "").trim();
}

function escapeXml(str: string): string {
  return stripUnsupportedChars(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function goldBorder(w = WIDTH, h = HEIGHT): string {
  return `<rect x="20" y="20" width="${w - 40}" height="${h - 40}" rx="12" ry="12" fill="none" stroke="${COLORS.softGold}" stroke-width="3"/>`;
}

function watermark(w = WIDTH, h = HEIGHT): string {
  return `<text x="${w / 2}" y="${h - 50}" text-anchor="middle" font-family="${BODY_FONT}" font-size="22" fill="${COLORS.softGold}" opacity="0.6">${WATERMARK}</text>`;
}

function headerText(text: string, y: number, color: string = COLORS.midnightPlum, w = WIDTH): string {
  // Wrap heading if too long (approx 22 chars at font-size 52 on 1080px)
  const maxChars = 22;
  if (text.length <= maxChars) {
    return `<text x="${w / 2}" y="${y}" text-anchor="middle" font-family="${HEADER_FONT}" font-size="52" font-weight="700" fill="${color}">${escapeXml(text)}</text>`;
  }
  // Split into two lines
  const lines = wrapText(text, maxChars);
  const lineHeight = 60;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  return lines.map((line, i) =>
    `<text x="${w / 2}" y="${startY + i * lineHeight}" text-anchor="middle" font-family="${HEADER_FONT}" font-size="48" font-weight="700" fill="${color}">${escapeXml(line)}</text>`
  ).join("\n");
}

function dividerLine(y: number, color: string = COLORS.softGold, w = WIDTH): string {
  const x1 = w / 2 - 80;
  const x2 = w / 2 + 80;
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${color}" stroke-width="2" opacity="0.7"/>`;
}

/** Wrap text into lines that fit a given width (approximate character-based) */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length > maxCharsPerLine) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ---------------------------------------------------------------------------
// Background styles
// ---------------------------------------------------------------------------

type StyleVariant = "A" | "B";

function backgroundStyleA(bg: string, w = WIDTH, h = HEIGHT): string {
  return `<rect width="${w}" height="${h}" fill="${bg}"/>`;
}

function backgroundStyleB(bg: string, w = WIDTH, h = HEIGHT): string {
  // Subtle witchy watercolour texture with overlapping translucent shapes
  return `
    <rect width="${w}" height="${h}" fill="${bg}"/>
    <defs>
      <radialGradient id="tex1" cx="20%" cy="30%" r="40%">
        <stop offset="0%" stop-color="${COLORS.lavender}" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="${COLORS.lavender}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="tex2" cx="75%" cy="70%" r="35%">
        <stop offset="0%" stop-color="${COLORS.dustyRose}" stop-opacity="0.1"/>
        <stop offset="100%" stop-color="${COLORS.dustyRose}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="tex3" cx="50%" cy="15%" r="30%">
        <stop offset="0%" stop-color="${COLORS.softGold}" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="${COLORS.softGold}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="tex4" cx="30%" cy="80%" r="25%">
        <stop offset="0%" stop-color="${COLORS.sage}" stop-opacity="0.1"/>
        <stop offset="100%" stop-color="${COLORS.sage}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#tex1)"/>
    <rect width="${w}" height="${h}" fill="url(#tex2)"/>
    <rect width="${w}" height="${h}" fill="url(#tex3)"/>
    <rect width="${w}" height="${h}" fill="url(#tex4)"/>
    <circle cx="${Math.round(w * 0.14)}" cy="${Math.round(h * 0.15)}" r="120" fill="${COLORS.softGold}" opacity="0.04"/>
    <circle cx="${Math.round(w * 0.83)}" cy="${Math.round(h * 0.74)}" r="180" fill="${COLORS.lavender}" opacity="0.06"/>
    <circle cx="${Math.round(w * 0.5)}" cy="${Math.round(h * 0.44)}" r="250" fill="${COLORS.dustyRose}" opacity="0.03"/>
  `;
}

function background(style: StyleVariant, bg: string, w = WIDTH, h = HEIGHT): string {
  return style === "A" ? backgroundStyleA(bg, w, h) : backgroundStyleB(bg, w, h);
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface TextSlideOptions {
  heading: string;
  body: string[];
  footer?: string;
  style?: StyleVariant;
  bgColor?: string;
  textColor?: string;
  dimensions?: { width: number; height: number };
}

/** Info card — heading + body paragraphs (crystal properties, zodiac traits) */
export function infoCardSvg(opts: TextSlideOptions): string {
  const style = opts.style ?? "A";
  const bg = opts.bgColor ?? COLORS.warmCream;
  const textColor = opts.textColor ?? COLORS.midnightPlum;
  const w = opts.dimensions?.width ?? WIDTH;
  const h = opts.dimensions?.height ?? HEIGHT;
  const sy = h / HEIGHT; // scale factor for Y positions

  const bodyLines: string[] = [];

  for (const paragraph of opts.body) {
    const wrapped = wrapText(paragraph, 42);
    for (const line of wrapped) {
      bodyLines.push(line);
    }
    bodyLines.push(""); // blank line between paragraphs
  }

  let bodyContent = "";
  let y = Math.round(280 * sy);
  for (const line of bodyLines) {
    if (line === "") {
      y += Math.round(20 * sy);
      continue;
    }
    bodyContent += `<text x="${w / 2}" y="${y}" text-anchor="middle" font-family="${BODY_FONT}" font-size="34" fill="${textColor}" opacity="0.85">${escapeXml(line)}</text>\n`;
    y += Math.round(48 * sy);
  }

  const footerContent = opts.footer
    ? `<text x="${w / 2}" y="${h - Math.round(100 * sy)}" text-anchor="middle" font-family="${HEADER_FONT}" font-size="28" font-style="italic" fill="${COLORS.softGold}">${escapeXml(opts.footer)}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${background(style, bg, w, h)}
    ${goldBorder(w, h)}
    ${headerText(opts.heading, Math.round(150 * sy), textColor, w)}
    ${dividerLine(Math.round(200 * sy), COLORS.softGold, w)}
    ${bodyContent}
    ${footerContent}
    ${watermark(w, h)}
  </svg>`;
}

/** List card — heading + bullet list (ingredients, correspondences) */
export function listCardSvg(opts: TextSlideOptions): string {
  const style = opts.style ?? "A";
  const bg = opts.bgColor ?? COLORS.warmCream;
  const textColor = opts.textColor ?? COLORS.midnightPlum;
  const w = opts.dimensions?.width ?? WIDTH;
  const h = opts.dimensions?.height ?? HEIGHT;
  const sy = h / HEIGHT;

  let bulletContent = "";
  let y = Math.round(300 * sy);

  for (const item of opts.body) {
    const wrapped = wrapText(item, 38);
    bulletContent += `<text x="120" y="${y}" font-family="${BODY_FONT}" font-size="32" fill="${COLORS.softGold}">&#x2726;</text>\n`;
    bulletContent += `<text x="160" y="${y}" font-family="${BODY_FONT}" font-size="32" fill="${textColor}" opacity="0.85">${escapeXml(wrapped[0])}</text>\n`;
    y += Math.round(46 * sy);
    for (let i = 1; i < wrapped.length; i++) {
      bulletContent += `<text x="160" y="${y}" font-family="${BODY_FONT}" font-size="32" fill="${textColor}" opacity="0.85">${escapeXml(wrapped[i])}</text>\n`;
      y += Math.round(46 * sy);
    }
    y += Math.round(8 * sy);
  }

  const footerContent = opts.footer
    ? `<text x="${w / 2}" y="${h - Math.round(100 * sy)}" text-anchor="middle" font-family="${HEADER_FONT}" font-size="28" font-style="italic" fill="${COLORS.softGold}">${escapeXml(opts.footer)}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${background(style, bg, w, h)}
    ${goldBorder(w, h)}
    ${headerText(opts.heading, Math.round(160 * sy), textColor, w)}
    ${dividerLine(Math.round(210 * sy), COLORS.softGold, w)}
    ${bulletContent}
    ${footerContent}
    ${watermark(w, h)}
  </svg>`;
}

/** Numbered steps card — heading + numbered items (spell steps, ritual guide) */
export function numberedStepsSvg(opts: TextSlideOptions): string {
  const style = opts.style ?? "A";
  const bg = opts.bgColor ?? COLORS.warmCream;
  const textColor = opts.textColor ?? COLORS.midnightPlum;
  const w = opts.dimensions?.width ?? WIDTH;
  const h = opts.dimensions?.height ?? HEIGHT;
  const sy = h / HEIGHT;

  let stepsContent = "";
  let y = Math.round(300 * sy);

  for (let i = 0; i < opts.body.length; i++) {
    const num = i + 1;
    const wrapped = wrapText(opts.body[i], 36);

    const circleY = y - 8;
    stepsContent += `<circle cx="105" cy="${circleY}" r="20" fill="${COLORS.softGold}" opacity="0.3"/>\n`;
    stepsContent += `<text x="105" y="${y}" text-anchor="middle" dominant-baseline="auto" font-family="${HEADER_FONT}" font-size="28" font-weight="700" fill="${COLORS.softGold}">${num}</text>\n`;

    stepsContent += `<text x="145" y="${y}" font-family="${BODY_FONT}" font-size="30" fill="${textColor}" opacity="0.85">${escapeXml(wrapped[0])}</text>\n`;
    y += Math.round(44 * sy);
    for (let j = 1; j < wrapped.length; j++) {
      stepsContent += `<text x="145" y="${y}" font-family="${BODY_FONT}" font-size="30" fill="${textColor}" opacity="0.85">${escapeXml(wrapped[j])}</text>\n`;
      y += Math.round(44 * sy);
    }
    y += Math.round(14 * sy);
  }

  const footerContent = opts.footer
    ? `<text x="${w / 2}" y="${h - Math.round(100 * sy)}" text-anchor="middle" font-family="${HEADER_FONT}" font-size="28" font-style="italic" fill="${COLORS.softGold}">${escapeXml(opts.footer)}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${background(style, bg, w, h)}
    ${goldBorder(w, h)}
    ${headerText(opts.heading, Math.round(160 * sy), textColor, w)}
    ${dividerLine(Math.round(210 * sy), COLORS.softGold, w)}
    ${stepsContent}
    ${footerContent}
    ${watermark(w, h)}
  </svg>`;
}

/** Journal prompts card — heading + italic prompts + footer affirmation */
export function journalPromptsSvg(opts: TextSlideOptions): string {
  const style = opts.style ?? "A";
  const bg = opts.bgColor ?? COLORS.warmCream;
  const textColor = opts.textColor ?? COLORS.midnightPlum;
  const w = opts.dimensions?.width ?? WIDTH;
  const h = opts.dimensions?.height ?? HEIGHT;
  const sy = h / HEIGHT;

  let promptsContent = "";
  let y = Math.round(310 * sy);

  for (const prompt of opts.body) {
    const wrapped = wrapText(prompt, 38);
    promptsContent += `<text x="90" y="${y}" font-family="${HEADER_FONT}" font-size="30" fill="${COLORS.softGold}">&#x2014;</text>\n`;
    for (const line of wrapped) {
      promptsContent += `<text x="130" y="${y}" font-family="${HEADER_FONT}" font-size="30" font-style="italic" fill="${textColor}" opacity="0.8">${escapeXml(line)}</text>\n`;
      y += Math.round(44 * sy);
    }
    y += Math.round(16 * sy);
  }

  const footerContent = opts.footer
    ? `<text x="${w / 2}" y="${h - Math.round(100 * sy)}" text-anchor="middle" font-family="${HEADER_FONT}" font-size="26" font-style="italic" fill="${COLORS.dustyRose}">${escapeXml(opts.footer)}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${background(style, bg, w, h)}
    ${goldBorder(w, h)}
    ${headerText(opts.heading, Math.round(160 * sy), textColor, w)}
    <text x="${w / 2}" y="${Math.round(210 * sy)}" text-anchor="middle" font-family="${BODY_FONT}" font-size="24" fill="${textColor}" opacity="0.5">Grab your journal and reflect</text>
    ${dividerLine(Math.round(250 * sy), COLORS.softGold, w)}
    ${promptsContent}
    ${footerContent}
    ${watermark(w, h)}
  </svg>`;
}

// ---------------------------------------------------------------------------
// Template dispatcher
// ---------------------------------------------------------------------------

export type TemplateType = "info" | "list" | "numbered" | "journal";

const TEMPLATE_MAP: Record<TemplateType, (opts: TextSlideOptions) => string> = {
  info: infoCardSvg,
  list: listCardSvg,
  numbered: numberedStepsSvg,
  journal: journalPromptsSvg,
};

// ---------------------------------------------------------------------------
// Render to PNG
// ---------------------------------------------------------------------------

export async function renderTextSlide(
  template: TemplateType,
  opts: TextSlideOptions,
  outputPath: string,
): Promise<boolean> {
  const svgFn = TEMPLATE_MAP[template];
  if (!svgFn) {
    console.error(`Unknown template: ${template}`);
    return false;
  }

  const svg = svgFn(opts);
  const svgBuffer = Buffer.from(svg);
  const w = opts.dimensions?.width ?? WIDTH;
  const h = opts.dimensions?.height ?? HEIGHT;

  try {
    await sharp(svgBuffer)
      .resize(w, h)
      .png()
      .toFile(outputPath);
    return true;
  } catch (err) {
    console.error(`Failed to render text slide: ${err}`);
    return false;
  }
}

/** Render both style A and B for comparison, returning paths */
export async function renderBothStyles(
  template: TemplateType,
  opts: Omit<TextSlideOptions, "style">,
  outputDir: string,
  baseName: string,
): Promise<{ styleA: string; styleB: string }> {
  fs.mkdirSync(outputDir, { recursive: true });

  const pathA = path.join(outputDir, `${baseName}_style_A.png`);
  const pathB = path.join(outputDir, `${baseName}_style_B.png`);

  await renderTextSlide(template, { ...opts, style: "A" }, pathA);
  await renderTextSlide(template, { ...opts, style: "B" }, pathB);

  return { styleA: pathA, styleB: pathB };
}

// ---------------------------------------------------------------------------
// CLI test mode
// ---------------------------------------------------------------------------

async function testRender() {
  const outputDir = "public/content/test-slides";
  fs.mkdirSync(outputDir, { recursive: true });

  console.log("\nTEXT SLIDE RENDERER — Test Output");
  console.log("=".repeat(50));

  // Info card test
  const infoResult = await renderBothStyles("info", {
    heading: "Amethyst Crystal",
    body: [
      "Amethyst enhances spiritual awareness, promotes sobriety, calms the mind, and provides protection during spiritual work.",
      "Chakras: Crown, Third Eye",
      "Element: Air, Water",
    ],
    footer: "Place on your third eye during meditation",
  }, outputDir, "info_card");
  console.log(`  Info card A: ${infoResult.styleA}`);
  console.log(`  Info card B: ${infoResult.styleB}`);

  // List card test
  const listResult = await renderBothStyles("list", {
    heading: "Protection Spell Ingredients",
    body: [
      "Sea salt or kosher salt — 1 cup",
      "White candle — for divine light",
      "Dried rosemary — purification",
      "Clear quartz crystal — amplification",
      "Small bowl for salt",
      "Lighter or matches",
    ],
    footer: "Best performed during the New Moon",
  }, outputDir, "list_card");
  console.log(`  List card A: ${listResult.styleA}`);
  console.log(`  List card B: ${listResult.styleB}`);

  // Numbered steps test
  const stepsResult = await renderBothStyles("numbered", {
    heading: "Salt Circle Protection",
    body: [
      "Light the white candle and place it in the center of your space",
      "Beginning in the North, slowly pour salt in a clockwise circle",
      "Visualize white light creating an impenetrable barrier",
      "Stand in the center and speak your protection incantation",
      "Sit quietly for 5-10 minutes feeling the protective energy",
      "Thank the elements and collect the salt",
    ],
  }, outputDir, "steps_card");
  console.log(`  Steps card A: ${stepsResult.styleA}`);
  console.log(`  Steps card B: ${stepsResult.styleB}`);

  // Journal prompts test
  const journalResult = await renderBothStyles("journal", {
    heading: "The Fool — Journal Prompts",
    body: [
      "Where in your life are you being called to take a leap of faith?",
      "What new beginning is waiting for you if you let go of fear?",
      "How can you embrace your inner child today?",
      "What would you do if you knew you couldn't fail?",
    ],
    footer: "I embrace new beginnings with an open heart",
  }, outputDir, "journal_card");
  console.log(`  Journal card A: ${journalResult.styleA}`);
  console.log(`  Journal card B: ${journalResult.styleB}`);

  console.log("\n" + "=".repeat(50));
  console.log(`All test slides saved to: ${outputDir}`);
  console.log("=".repeat(50) + "\n");
}

// CLI entry
if (process.argv[2] === "test") {
  testRender().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
