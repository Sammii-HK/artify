/**
 * Single-Day Content Planning
 *
 * Extracted from content-pipeline.ts — builds one day's content schedule
 * based on astrology data and the weekly cadence.
 *
 * Variety is achieved through:
 * - Themed scene pools with seeded rotation (no repeats within a week)
 * - Moon-phase-aware scene selection
 * - Zodiac-season-aware feed posts
 * - Expanded carousel rotation arrays
 * - Rotating engagement stories
 * - Tarot Major Arcana integration
 * - Eclipse-aware and Mercury retrograde-aware scheduling
 * - 7-day sabbat ramp-up window
 * - Rune and spell boosts
 */

import { SCENES, type Scene } from "../scenes";
import {
  getAstroContext,
  getSabbatNear,
  type AstroContext,
} from "../astro";
import { CAROUSEL_TYPES } from "../../../scripts/carousel-types";
import { isFalAvailable } from "../../../scripts/fal-video";
import type { TemplateType } from "../../../scripts/text-slide-renderer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScheduledPost {
  sceneKey: string;
  scene: Scene;
  slot: "feed" | "story" | "reel";
  format: "single" | "carousel" | "reel_placeholder" | "reel_remotion" | "reel_living" | "reel_kenburns";
  contentType?: string;
  dataRef?: string;
  storyFormat?: "kontext" | "text_slide";
  engagementCta?: string;
  recapSource?: { dayName: string; contentType: string };
  animateScene?: string;
  storyAnimated?: boolean;
}

export interface DayPlan {
  date: Date;
  astro: AstroContext;
  posts: ScheduledPost[];
}

// ---------------------------------------------------------------------------
// Post constructors
// ---------------------------------------------------------------------------

function post(key: string, slot: "feed" | "story", format: "single" | "carousel" = "single", contentType?: string): ScheduledPost {
  return { sceneKey: key, scene: SCENES[key], slot, format, contentType };
}

function carousel(contentType: string, slot: "feed" | "story" = "feed"): ScheduledPost {
  const hookScene = CAROUSEL_TYPES[contentType]?.hookScene ?? "tarot_spread_layout";
  return { sceneKey: hookScene, scene: SCENES[hookScene], slot, format: "carousel", contentType };
}

export function kontextStory(sceneKey: string): ScheduledPost {
  return { sceneKey, scene: SCENES[sceneKey], slot: "story", format: "single", storyFormat: "kontext" };
}

export function engagementStory(sceneKey: string, cta: string): ScheduledPost {
  return { sceneKey, scene: SCENES[sceneKey], slot: "story", format: "single", storyFormat: "text_slide", engagementCta: cta };
}

function reelCarouselRecap(dayName: string, contentType: string): ScheduledPost {
  const key = "daily_oracle";
  return {
    sceneKey: key,
    scene: SCENES[key],
    slot: "reel",
    format: "reel_remotion",
    recapSource: { dayName, contentType },
  };
}

function reelLivingIllustration(sceneKey: string): ScheduledPost {
  return {
    sceneKey,
    scene: SCENES[sceneKey] ?? SCENES["daily_oracle"],
    slot: "reel",
    format: "reel_living",
    animateScene: sceneKey,
  };
}

function reelKenBurns(sceneKey: string): ScheduledPost {
  return {
    sceneKey,
    scene: SCENES[sceneKey] ?? SCENES["daily_oracle"],
    slot: "reel",
    format: "reel_kenburns",
    animateScene: sceneKey,
  };
}

// ---------------------------------------------------------------------------
// Engagement story config
// ---------------------------------------------------------------------------

export const ENGAGEMENT_STORY_CONFIG: Record<string, { cta: string; template: TemplateType }> = {
  poll_this_or_that: { cta: "DM me A or B!", template: "info" },
  ask_sammii: { cta: "DM me your witchy question!", template: "info" },
  spell_tip: { cta: "Screenshot & share!", template: "numbered" },
  zodiac_meme: { cta: "Tag a friend who's this sign!", template: "info" },
  gratitude_check: { cta: "Reply with yours!", template: "journal" },
};

// ---------------------------------------------------------------------------
// Seeded randomness
// ---------------------------------------------------------------------------

export function daySeed(date: Date): number {
  const str = date.toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}

/** Seeded PRNG — returns values in [0, 1) */
function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Pick from an array using a seeded RNG, avoiding items already used today */
function pick<T>(pool: T[], rng: () => number, used: Set<T> = new Set()): T {
  const available = pool.filter((x) => !used.has(x));
  const arr = available.length > 0 ? available : pool;
  return arr[Math.floor(rng() * arr.length)];
}

// ---------------------------------------------------------------------------
// Scene pools — themed groups for variety
// ---------------------------------------------------------------------------

/** Oracle / divination story scenes */
const ORACLE_SCENES = [
  "daily_oracle",
  "daily_card_pull",
  "pendulum",
  "rune_cast",
  "birth_chart",
];

/** Moon-themed story scenes */
const MOON_SCENES = [
  "moon_phase_checkin",
  "moon_energy_update",
  "full_moon",
  "new_moon_ritual",
  "eclipse_ritual",
];

/** Morning / self-care story scenes */
const MORNING_SCENES = [
  "morning_ritual",
  "weekly_affirmation",
  "affirmation_sunrise",
  "chakra_meditation",
  "gratitude_check",
];

/** Crystal story scenes */
const CRYSTAL_SCENES = [
  "crystal_of_the_day",
  "amethyst_guide",
  "crystal_grid",
];

/** Spell / witchy craft story scenes */
const SPELL_SCENES = [
  "candle_magic",
  "intention_spell",
  "jar_spell",
  "spell_tip",
];

/** Evening / reflective story scenes */
const EVENING_SCENES = [
  "evening_wind_down",
  "shadow_work",
  "moon_phase_checkin",
];

/** Behind-the-scenes / personality story scenes */
const PERSONALITY_SCENES = [
  "behind_the_scenes",
  "ask_sammii",
  "daily_oracle",
  "grimoire_page",
];

/** Rune scenes */
const RUNE_SCENES = [
  "rune_cast",
  "rune_stone_reading",
];

/** All engagement story keys */
const ENGAGEMENT_KEYS = Object.keys(ENGAGEMENT_STORY_CONFIG);

// ---------------------------------------------------------------------------
// Tarot Major Arcana — all 22 cards
// ---------------------------------------------------------------------------

const TAROT_SCENES = [
  "tarot_00_fool",
  "tarot_01_magician",
  "tarot_02_high_priestess",
  "tarot_03_empress",
  "tarot_04_emperor",
  "tarot_05_hierophant",
  "tarot_06_lovers",
  "tarot_07_chariot",
  "tarot_08_strength",
  "tarot_09_hermit",
  "tarot_10_wheel",
  "tarot_11_justice",
  "tarot_12_hanged_man",
  "tarot_13_death",
  "tarot_14_temperance",
  "tarot_15_devil",
  "tarot_16_tower",
  "tarot_17_star",
  "tarot_18_moon",
  "tarot_19_sun",
  "tarot_20_judgement",
  "tarot_21_world",
];

// ---------------------------------------------------------------------------
// Zodiac scene map — all 12 signs
// ---------------------------------------------------------------------------

const ZODIAC_SCENE_MAP: Record<string, string> = {
  Pisces:      "pisces_season",
  Aries:       "zodiac_season_announce",
  Taurus:      "zodiac_season_announce",
  Gemini:      "zodiac_season_announce",
  Cancer:      "zodiac_season_announce",
  Leo:         "zodiac_season_announce",
  Virgo:       "zodiac_season_announce",
  Libra:       "zodiac_season_announce",
  Scorpio:     "zodiac_season_announce",
  Sagittarius: "zodiac_season_announce",
  Capricorn:   "zodiac_season_announce",
  Aquarius:    "zodiac_season_announce",
};

// ---------------------------------------------------------------------------
// Moon-phase-aware scene selection
// ---------------------------------------------------------------------------

/** Pick a moon scene that matches the current lunar phase */
function moonSceneForPhase(moonName: string, rng: () => number, used: Set<string>): string {
  const phaseScenes: Record<string, string[]> = {
    "New Moon":        ["new_moon_ritual", "moon_phase_checkin", "moon_energy_update"],
    "Waxing Crescent": ["moon_phase_checkin", "moon_energy_update", "crystal_of_the_day"],
    "First Quarter":   ["moon_energy_update", "moon_phase_checkin", "intention_spell"],
    "Waxing Gibbous":  ["moon_phase_checkin", "moon_energy_update", "daily_oracle"],
    "Full Moon":       ["full_moon", "moon_phase_checkin", "moon_energy_update"],
    "Waning Gibbous":  ["moon_energy_update", "moon_phase_checkin", "evening_wind_down"],
    "Last Quarter":    ["moon_phase_checkin", "shadow_work", "moon_energy_update"],
    "Waning Crescent": ["moon_energy_update", "evening_wind_down", "moon_phase_checkin"],
  };
  const pool = phaseScenes[moonName] ?? MOON_SCENES;
  return pick(pool, rng, used);
}

// ---------------------------------------------------------------------------
// Carousel rotation — expanded pools
// ---------------------------------------------------------------------------

const MONDAY_CAROUSELS = ["moon_guide", "crystal_guide", "chakra_guide"];
const TUESDAY_CAROUSELS = ["tarot_meaning", "rune_reading", "spell_guide"];
const THURSDAY_CAROUSELS = ["crystal_guide", "spell_guide", "chakra_guide", "tarot_meaning"];
const SUNDAY_CAROUSELS = ["zodiac_breakdown", "angel_number", "moon_guide", "tarot_meaning"];

const SATURDAY_SINGLES = [
  "kitchen_witch", "tea_reading", "grimoire_page", "weekly_affirmation",
  "mood_rainy_day", "spirit_animal", "affirmation_sunrise",
];

const LIVING_ILLUSTRATION_SCENES = [
  "candle_magic",
  "full_moon",
  "crystal_of_the_day",
  "pendulum",
  "morning_ritual",
  "new_moon_ritual",
  "jar_spell",
  "intention_spell",
];

// ---------------------------------------------------------------------------
// Sabbat proximity helpers
// ---------------------------------------------------------------------------

/** Get days until sabbat (negative = past, positive = future) */
function daysUntilSabbat(date: Date, sabbat: { month: number; day: number }): number {
  const year = date.getFullYear();
  const sDate = new Date(year, sabbat.month - 1, sabbat.day);
  return Math.round((sDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// Build a single day's plan
// ---------------------------------------------------------------------------

export function buildDayPlan(date: Date): DayPlan {
  const astro = getAstroContext(date);
  const posts: ScheduledPost[] = [];
  const day = astro.dayName;
  const seed = daySeed(date);
  const rng = seededRng(seed);

  // Track scenes used today to avoid duplicates
  const usedScenes = new Set<string>();

  /** Pick a scene from a pool, track it as used */
  function pickScene(pool: string[]): string {
    const scene = pick(pool, rng, usedScenes);
    usedScenes.add(scene);
    return scene;
  }

  /** Pick an engagement story */
  function pickEngagement(): ScheduledPost {
    const key = pickScene(ENGAGEMENT_KEYS);
    return engagementStory(key, ENGAGEMENT_STORY_CONFIG[key].cta);
  }

  /** Pick a seeded tarot card for the day */
  function pickTarot(): string {
    return TAROT_SCENES[seed % TAROT_SCENES.length];
  }

  // Determine if Mercury retrograde is active — boosts divination content
  const inRetrograde = astro.mercuryRetrograde?.active ?? false;

  if (day === "Monday") {
    // Moon day — carousel + moon-aware stories
    posts.push(carousel(pick(MONDAY_CAROUSELS, rng)));
    posts.push(kontextStory(pickScene(ORACLE_SCENES)));
    posts.push(kontextStory(moonSceneForPhase(astro.moon.name, rng, usedScenes)));
    posts.push(kontextStory(pickScene(MORNING_SCENES)));
    posts.push(pickEngagement());
  }

  if (day === "Tuesday") {
    // Tarot / divination day — carousel + tarot feed post + stories
    posts.push(carousel(pick(TUESDAY_CAROUSELS, rng)));
    posts.push(post(pickTarot(), "feed"));  // Tarot card as feed post
    posts.push(kontextStory(pickTarot()));  // Daily Tarot story
    posts.push(kontextStory(pickScene(ORACLE_SCENES)));
    posts.push(kontextStory(moonSceneForPhase(astro.moon.name, rng, usedScenes)));
    posts.push(pickEngagement());
  }

  if (day === "Wednesday") {
    // Astrology / zodiac day — stories + reel recap + rune/spell slot
    posts.push(kontextStory(pickScene(CRYSTAL_SCENES)));
    posts.push(kontextStory(pickScene(ORACLE_SCENES)));
    posts.push(kontextStory(pickScene(RUNE_SCENES)));  // Rune/spell Wednesday slot
    posts.push(pickEngagement());
    const tuesdayContentType = pick(TUESDAY_CAROUSELS, seededRng(seed));
    posts.push(reelCarouselRecap("Tuesday", tuesdayContentType));
  }

  if (day === "Thursday") {
    // Crystal / spell day — now with daily tarot card
    posts.push(carousel(pick(THURSDAY_CAROUSELS, rng)));
    posts.push(kontextStory(pickTarot()));  // Daily Tarot story
    posts.push(kontextStory(pickScene(CRYSTAL_SCENES)));
    posts.push(kontextStory(pickScene(EVENING_SCENES)));
    posts.push(pickEngagement());
  }

  if (day === "Friday") {
    // Spell day + reel
    posts.push(kontextStory(pickScene(SPELL_SCENES)));
    posts.push(kontextStory(pickScene(PERSONALITY_SCENES)));
    posts.push(kontextStory(pickScene(EVENING_SCENES)));
    posts.push(pickEngagement());
    const animScene = pick(LIVING_ILLUSTRATION_SCENES, rng);
    if (isFalAvailable()) {
      posts.push(reelLivingIllustration(animScene));
    } else {
      posts.push(reelKenBurns(animScene));
    }
  }

  if (day === "Saturday") {
    // Cosy day — single feed post + stories + rune/spell slot
    const satScene = pick(SATURDAY_SINGLES, rng);
    posts.push(post(satScene, "feed"));
    posts.push(kontextStory(pickScene(ORACLE_SCENES)));
    posts.push(kontextStory(moonSceneForPhase(astro.moon.name, rng, usedScenes)));
    posts.push(kontextStory(pickScene(RUNE_SCENES)));  // Rune/spell Saturday slot
    posts.push(pickEngagement());
  }

  if (day === "Sunday") {
    // Reflection day — carousel + calming stories
    // 1 in 3 chance: swap morning story for a tarot scene
    const tarotSunday = (seed % 3) === 0;
    posts.push(carousel(pick(SUNDAY_CAROUSELS, rng)));
    posts.push(kontextStory(moonSceneForPhase(astro.moon.name, rng, usedScenes)));
    posts.push(kontextStory(tarotSunday ? pickTarot() : pickScene(MORNING_SCENES)));
    posts.push(kontextStory(pickScene(EVENING_SCENES)));
    posts.push(pickEngagement());
  }

  // ---------------------------------------------------------------------------
  // Zodiac season feed post — add when we're in a season that has a scene
  // ---------------------------------------------------------------------------
  const zodiacScene = ZODIAC_SCENE_MAP[astro.zodiac.sign];
  if (zodiacScene && SCENES[zodiacScene]) {
    // Add once per week (use seed to pick a day — roughly every ~3 days)
    if (seed % 3 === 0) {
      posts.unshift(post(zodiacScene, "feed"));
    }
  }

  // ---------------------------------------------------------------------------
  // Eclipse-aware scheduling
  // ---------------------------------------------------------------------------
  if (astro.eclipse) {
    // Priority feed post for eclipse
    posts.unshift(post("eclipse_ritual", "feed"));
    // Replace last engagement story with eclipse-themed story
    const lastEngIdx = posts.findLastIndex(p => p.storyFormat === "text_slide");
    if (lastEngIdx >= 0) {
      posts[lastEngIdx] = kontextStory("eclipse_ritual");
    }
  }

  // ---------------------------------------------------------------------------
  // Mercury retrograde boosts
  // ---------------------------------------------------------------------------
  if (inRetrograde) {
    // Day 1 of retrograde: special feed post
    if (astro.mercuryRetrograde!.dayNumber === 1) {
      posts.unshift(post("zodiac_constellation_gaze", "feed"));
    }
    // During retrograde: boost tarot/divination — add extra tarot story
    posts.push(kontextStory(pickScene([...TAROT_SCENES, ...RUNE_SCENES])));
  }

  // ---------------------------------------------------------------------------
  // Sabbat ramp-up — expanded 7-day window
  // ---------------------------------------------------------------------------
  const nearSabbat = getSabbatNear(date, 7);
  if (nearSabbat) {
    const daysTo = daysUntilSabbat(date, nearSabbat);

    if (daysTo >= 5 && daysTo <= 7) {
      // 7-5 days before: one sabbat-themed story
      posts.push(kontextStory("sabbat_altar"));
    } else if (daysTo >= 2 && daysTo <= 4) {
      // 4-2 days before: sabbat feed post
      posts.push(post("sabbat_altar", "feed"));
    } else if (daysTo >= -1 && daysTo <= 1) {
      // Day of + day after: primary feed post
      posts.unshift(post("sabbat_altar", "feed"));
    }
  }

  // Mark stories for animation
  let firstKontextMarked = false;
  for (const p of posts) {
    if (p.slot === "story" && p.storyFormat === "kontext" && !firstKontextMarked) {
      p.storyAnimated = true;
      firstKontextMarked = true;
    }
    if (p.slot === "story" && p.storyFormat === "text_slide") {
      p.storyAnimated = true;
    }
  }

  return { date, astro, posts };
}

// ---------------------------------------------------------------------------
// Build weekly calendar (calls buildDayPlan in a loop)
// ---------------------------------------------------------------------------

export function buildWeeklyCalendar(startDate: Date): DayPlan[] {
  const calendar: DayPlan[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    calendar.push(buildDayPlan(date));
  }
  return calendar;
}
