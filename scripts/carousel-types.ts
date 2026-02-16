/**
 * Carousel Type Registry
 *
 * 8 carousel content types, each mapping a data source to slide content.
 * Used by content-pipeline.ts to build text slides from the /data/ JSON library.
 */

import * as fs from "fs";
import * as path from "path";
import type { TextSlideOptions, TemplateType } from "./text-slide-renderer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SlideSpec {
  template: TemplateType;
  options: TextSlideOptions;
}

export interface CarouselType {
  id: string;
  label: string;
  dataFile: string;
  /** Scene key for the hook image (slide 1) */
  hookScene: string;
  /** Given a random item from the data, produce text slides (slides 2-N) */
  buildSlides: (item: Record<string, unknown>, itemKey: string) => SlideSpec[];
  /** Select a random item key from the loaded data */
  selectItem: (data: Record<string, unknown>, usedKeys: string[], seed: number) => { key: string; item: Record<string, unknown> } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadJson(filePath: string): unknown {
  const abs = path.resolve(__dirname, "..", filePath);
  return JSON.parse(fs.readFileSync(abs, "utf-8"));
}

/** Seeded pseudo-random number generator */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Generic item selector for object-keyed data files */
function selectFromObject(
  data: Record<string, unknown>,
  usedKeys: string[],
  seed: number,
): { key: string; item: Record<string, unknown> } | null {
  const allKeys = Object.keys(data);
  const available = allKeys.filter((k) => !usedKeys.includes(k));
  if (available.length === 0) return null;
  const rng = seededRandom(seed);
  const key = pickRandom(available, rng);
  return { key, item: data[key] as Record<string, unknown> };
}

/** Generic item selector for array-based data files */
function selectFromArray(
  data: unknown[],
  usedKeys: string[],
  seed: number,
  idField: string = "id",
): { key: string; item: Record<string, unknown> } | null {
  const items = data as Record<string, unknown>[];
  const available = items.filter((it) => !usedKeys.includes(String(it[idField])));
  if (available.length === 0) return null;
  const rng = seededRandom(seed);
  const item = pickRandom(available, rng);
  return { key: String(item[idField]), item };
}

function asStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  return [];
}

function asString(val: unknown, fallback: string = ""): string {
  return typeof val === "string" ? val : fallback;
}

// ---------------------------------------------------------------------------
// Carousel type definitions
// ---------------------------------------------------------------------------

const tarotMeaning: CarouselType = {
  id: "tarot_meaning",
  label: "Tarot Card Meaning",
  dataFile: "data/tarot-cards.json",
  hookScene: "tarot_spread_layout",
  selectItem(data, usedKeys, seed) {
    // Tarot data has majorArcana as a nested object
    const major = (data as { majorArcana: Record<string, unknown> }).majorArcana;
    return selectFromObject(major, usedKeys, seed);
  },
  buildSlides(item) {
    const name = asString(item.name, "Tarot Card");
    return [
      {
        template: "info",
        options: {
          heading: `${name} — Upright`,
          body: [
            asString(item.uprightMeaning, ""),
            `Keywords: ${asStringArray(item.keywords).join(", ")}`,
          ],
          footer: asString(item.affirmation),
        },
      },
      {
        template: "info",
        options: {
          heading: `${name} — Reversed`,
          body: [asString(item.reversedMeaning, "")],
          style: "B",
        },
      },
      {
        template: "journal",
        options: {
          heading: `${name} — Journal Prompts`,
          body: [
            `What does ${name}'s energy mean in your life right now?`,
            asString(item.loveMeaning, "How does this card speak to your relationships?"),
            asString(item.careerMeaning, "What career insight does this card offer?"),
          ],
          footer: asString(item.affirmation),
          style: "A",
        },
      },
    ];
  },
};

const crystalGuide: CarouselType = {
  id: "crystal_guide",
  label: "Crystal Guide",
  dataFile: "data/crystals.json",
  hookScene: "crystal_rose_quartz_hold",
  selectItem(data, usedKeys, seed) {
    return selectFromArray(data as unknown as unknown[], usedKeys, seed);
  },
  buildSlides(item) {
    const name = asString(item.name, "Crystal");
    const working = item.workingWith as Record<string, string> | undefined;
    const care = item.careInstructions as Record<string, unknown> | undefined;

    return [
      {
        template: "list",
        options: {
          heading: `${name} — Properties`,
          body: [
            `Chakras: ${asStringArray(item.chakras).join(", ")}`,
            `Elements: ${asStringArray(item.elements).join(", ")}`,
            `Zodiac: ${asStringArray(item.zodiacSigns).join(", ")}`,
            asString(item.description),
            ...asStringArray(item.properties).slice(0, 4).map((p) => `${p}`),
          ],
          footer: asString(item.metaphysicalProperties).slice(0, 80),
        },
      },
      {
        template: "numbered",
        options: {
          heading: `How to Use ${name}`,
          body: [
            working?.meditation ?? `Hold ${name} during meditation`,
            working?.healing ?? `Place on relevant chakra for healing`,
            working?.spellwork ?? `Incorporate into your spellwork`,
            working?.manifestation ?? `Use for manifestation rituals`,
          ],
          style: "B",
        },
      },
      {
        template: "list",
        options: {
          heading: `${name} — Care & Cleansing`,
          body: [
            ...asStringArray(care?.cleansing).slice(0, 4).map((c) => `Cleanse with ${c}`),
            ...asStringArray(care?.charging).slice(0, 2).map((c) => `Charge by ${c}`),
          ],
          footer: `Handle your ${name} with intention`,
          style: "A",
        },
      },
    ];
  },
};

const spellGuide: CarouselType = {
  id: "spell_guide",
  label: "Spell Guide",
  dataFile: "data/spells.json",
  hookScene: "spell_altar_setup",
  selectItem(data, usedKeys, seed) {
    return selectFromArray(data as unknown as unknown[], usedKeys, seed);
  },
  buildSlides(item) {
    const title = asString(item.title, "Spell");
    const ingredients = (item.ingredients as { name: string; purpose?: string }[] | undefined) ?? [];
    const steps = asStringArray(item.steps);
    const safety = asStringArray(item.safety);

    return [
      {
        template: "list",
        options: {
          heading: `${title} — Ingredients`,
          body: ingredients.slice(0, 7).map(
            (ing) => `${ing.name}${ing.purpose ? ` — ${ing.purpose}` : ""}`,
          ),
          footer: `Difficulty: ${asString(item.difficulty, "beginner")} | ${asString(item.duration, "")}`,
        },
      },
      {
        template: "numbered",
        options: {
          heading: `${title} — Steps`,
          body: steps.slice(0, 6),
          style: "B",
        },
      },
      {
        template: "list",
        options: {
          heading: `${title} — Timing & Safety`,
          body: [
            ...(() => {
              const timing = item.timing as { moonPhase?: string[]; timeOfDay?: string } | undefined;
              const lines: string[] = [];
              if (timing?.moonPhase) lines.push(`Moon phase: ${asStringArray(timing.moonPhase).join(", ")}`);
              if (timing?.timeOfDay) lines.push(`Time of day: ${timing.timeOfDay}`);
              return lines;
            })(),
            ...safety.slice(0, 4),
          ],
          footer: asString(item.purpose),
          style: "A",
        },
      },
    ];
  },
};

const moonGuide: CarouselType = {
  id: "moon_guide",
  label: "Moon Phase Guide",
  dataFile: "data/correspondences.json",
  hookScene: "moon_waxing_ritual",
  selectItem(data, usedKeys, seed) {
    const moonPhases = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
    const available = moonPhases.filter((p) => !usedKeys.includes(p));
    if (available.length === 0) return null;
    const rng = seededRandom(seed);
    const phase = pickRandom(available, rng);
    return { key: phase, item: { phase, data } };
  },
  buildSlides(item) {
    const phase = asString(item.phase, "Moon Phase");
    const moonMeanings: Record<string, { meaning: string; dos: string[]; donts: string[]; ritual: string }> = {
      "New Moon": {
        meaning: "Time for new beginnings, setting intentions, and planting seeds. Energy is quiet and introspective.",
        dos: ["Set intentions and goals", "Start new projects", "Cleanse your space", "Journal about what you want to manifest"],
        donts: ["Harvest or collect results", "Make major decisions", "Push forward aggressively"],
        ritual: "Write your intentions on paper, light a white candle, and visualize your goals",
      },
      "Waxing Crescent": {
        meaning: "Energy is building. Time to take first action steps toward your intentions.",
        dos: ["Take inspired action", "Affirm your intentions daily", "Build momentum", "Trust the process"],
        donts: ["Give up if progress is slow", "Second-guess your intentions", "Overcommit"],
        ritual: "Create a vision board or carry a crystal charged with your intention",
      },
      "First Quarter": {
        meaning: "A turning point. Time for decision-making, overcoming obstacles, and committing to your path.",
        dos: ["Make decisions", "Face challenges head-on", "Reassess and adjust", "Take bold action"],
        donts: ["Procrastinate", "Avoid difficult conversations", "Stay in comfort zone"],
        ritual: "Light an orange candle and meditate on the courage to overcome obstacles",
      },
      "Full Moon": {
        meaning: "Peak energy, illumination, and manifestation. What you've been working toward reaches fruition.",
        dos: ["Celebrate your progress", "Charge crystals", "Perform gratitude rituals", "Release what no longer serves"],
        donts: ["Start new projects", "Make impulsive decisions", "Ignore your emotions"],
        ritual: "Place crystals under the moonlight, take a ritual bath, and release old patterns",
      },
      "Waning Gibbous": {
        meaning: "Time for gratitude, sharing wisdom, and beginning to let go.",
        dos: ["Practice gratitude", "Share knowledge with others", "Begin releasing", "Reflect on lessons learned"],
        donts: ["Cling to outcomes", "Start new ventures", "Ignore rest"],
        ritual: "Write a gratitude list and burn it as an offering of thanks",
      },
      "Last Quarter": {
        meaning: "Time for release, forgiveness, and clearing space for the next cycle.",
        dos: ["Let go of what no longer serves", "Forgive", "Declutter physical and energetic space", "Rest"],
        donts: ["Hold grudges", "Take on new responsibilities", "Force outcomes"],
        ritual: "Write what you want to release on paper and safely burn it",
      },
      "Waning Crescent": {
        meaning: "The quiet before the new cycle. Time for rest, surrender, and deep reflection.",
        dos: ["Rest and restore", "Meditate", "Dream journal", "Surrender to the process"],
        donts: ["Push for new beginnings", "Overexert yourself", "Ignore your need for rest"],
        ritual: "Take a cleansing salt bath and meditate on surrender",
      },
      "Waxing Gibbous": {
        meaning: "Refine and adjust. Energy is almost at its peak — fine-tune your approach.",
        dos: ["Refine your plans", "Trust your intuition", "Stay patient", "Make small adjustments"],
        donts: ["Make drastic changes", "Doubt your path", "Compare yourself to others"],
        ritual: "Anoint a purple candle with lavender oil and meditate on trust",
      },
    };

    const info = moonMeanings[phase] ?? moonMeanings["Full Moon"];

    return [
      {
        template: "info",
        options: {
          heading: `${phase}`,
          body: [info.meaning],
          footer: "Work with the moon's energy, not against it",
        },
      },
      {
        template: "list",
        options: {
          heading: `${phase} — Do's & Don'ts`,
          body: [
            ...info.dos.map((d) => `Do: ${d}`),
            ...info.donts.map((d) => `Don't: ${d}`),
          ],
          style: "B",
        },
      },
      {
        template: "numbered",
        options: {
          heading: `${phase} Ritual`,
          body: info.ritual.split(", ").map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
          footer: "Adapt this ritual to what feels right for you",
          style: "A",
        },
      },
    ];
  },
};

const zodiacBreakdown: CarouselType = {
  id: "zodiac_breakdown",
  label: "Zodiac Sign Breakdown",
  dataFile: "data/zodiac-signs.json",
  hookScene: "zodiac_constellation_gaze",
  selectItem: selectFromObject,
  buildSlides(item) {
    const name = asString(item.name, "Sign");
    const symbol = asString(item.symbol, "");

    return [
      {
        template: "info",
        options: {
          heading: `${symbol} ${name}`,
          body: [
            `Element: ${asString(item.element)} | Modality: ${asString(item.modality)}`,
            `Ruling Planet: ${asString(item.rulingPlanet)}`,
            `Dates: ${asString(item.dates)}`,
            asString(item.description),
          ],
        },
      },
      {
        template: "list",
        options: {
          heading: `${name} — Strengths & Weaknesses`,
          body: [
            ...asStringArray(item.strengths).slice(0, 4).map((s) => `Strength: ${s}`),
            ...asStringArray(item.weaknesses).slice(0, 3).map((w) => `Shadow: ${w}`),
          ],
          style: "B",
        },
      },
      {
        template: "info",
        options: {
          heading: `${name} — Love & Career`,
          body: [
            asString(item.loveTrait),
            asString(item.careerTrait),
            `Best matches: ${asStringArray(item.bestMatches).join(", ")}`,
          ],
          footer: asString(item.affirmation),
          style: "A",
        },
      },
    ];
  },
};

const chakraGuide: CarouselType = {
  id: "chakra_guide",
  label: "Chakra Guide",
  dataFile: "data/chakras.json",
  hookScene: "chakra_healing_hands",
  selectItem: selectFromObject,
  buildSlides(item) {
    const name = asString(item.name, "Chakra");
    const sanskrit = asString(item.sanskritName, "");

    return [
      {
        template: "info",
        options: {
          heading: `${name} Chakra`,
          body: [
            `Sanskrit: ${sanskrit} | Color: ${asString(item.color)}`,
            `Location: ${asString(item.location)}`,
            `Element: ${asString(item.element)}`,
            asString(item.properties),
          ],
          footer: `Seed mantra: ${asString(item.seedMantra)}`,
        },
      },
      {
        template: "list",
        options: {
          heading: `${name} — Blockage Signs`,
          body: asStringArray(item.blockageSymptoms).slice(0, 6),
          style: "B",
        },
      },
      {
        template: "numbered",
        options: {
          heading: `${name} — Healing Practices`,
          body: asStringArray(item.healingPractices).slice(0, 6),
          footer: asString(item.affirmation),
          style: "A",
        },
      },
    ];
  },
};

const runeReading: CarouselType = {
  id: "rune_reading",
  label: "Rune Reading",
  dataFile: "data/runes.json",
  hookScene: "rune_stone_reading",
  selectItem: selectFromObject,
  buildSlides(item) {
    const name = asString(item.name, "Rune");
    const symbol = asString(item.symbol, "");

    return [
      {
        template: "info",
        options: {
          heading: `${symbol} ${name}`,
          body: [
            `Meaning: ${asString(item.meaning)}`,
            `Element: ${asString(item.element)}`,
            asString(item.uprightMeaning, ""),
          ],
          footer: `Pronunciation: ${asString(item.pronunciation)}`,
        },
      },
      {
        template: "list",
        options: {
          heading: `${name} — Magical Uses`,
          body: asStringArray(item.magicalUses).slice(0, 6),
          style: "B",
        },
      },
      {
        template: "info",
        options: {
          heading: `${name} — Affirmation`,
          body: [asString(item.affirmation)],
          footer: `Reversed: ${asString(item.reversedMeaning, "").slice(0, 80)}...`,
          style: "A",
        },
      },
    ];
  },
};

const angelNumber: CarouselType = {
  id: "angel_number",
  label: "Angel Number Meaning",
  dataFile: "data/angel-numbers.json",
  hookScene: "angel_number_vision",
  selectItem(data, usedKeys, seed) {
    const numbers = (data as { numbers: Record<string, unknown> }).numbers;
    return selectFromObject(numbers, usedKeys, seed);
  },
  buildSlides(item) {
    const number = asString(item.number, "???");
    const name = asString(item.name, `${number} Angel Number`);

    return [
      {
        template: "info",
        options: {
          heading: name,
          body: [
            asString(item.coreMeaning),
            asString(item.quickMeaning),
          ],
          footer: `Keywords: ${asStringArray(item.keywords).join(", ")}`,
        },
      },
      {
        template: "info",
        options: {
          heading: `Why You Keep Seeing ${number}`,
          body: [asString(item.whyYouKeepSeeing)],
          style: "B",
        },
      },
      {
        template: "numbered",
        options: {
          heading: `${number} — What to Do`,
          body: asStringArray(item.whatToDo).slice(0, 5),
          footer: asString(item.spiritualMeaning, "").slice(0, 80),
          style: "A",
        },
      },
    ];
  },
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const CAROUSEL_TYPES: Record<string, CarouselType> = {
  tarot_meaning: tarotMeaning,
  crystal_guide: crystalGuide,
  spell_guide: spellGuide,
  moon_guide: moonGuide,
  zodiac_breakdown: zodiacBreakdown,
  chakra_guide: chakraGuide,
  rune_reading: runeReading,
  angel_number: angelNumber,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Load data and build slides for a carousel type, avoiding used keys */
export function buildCarouselSlides(
  contentType: string,
  usedKeys: string[],
  seed: number,
): { slides: SlideSpec[]; dataRef: string; hookScene: string } | null {
  const ct = CAROUSEL_TYPES[contentType];
  if (!ct) return null;

  const data = loadJson(ct.dataFile) as Record<string, unknown>;
  const selected = ct.selectItem(data, usedKeys, seed);
  if (!selected) return null;

  const slides = ct.buildSlides(selected.item, selected.key);
  return {
    slides,
    dataRef: selected.key,
    hookScene: ct.hookScene,
  };
}

/** Get the hook scene key for a carousel type */
export function getHookScene(contentType: string): string | null {
  return CAROUSEL_TYPES[contentType]?.hookScene ?? null;
}
