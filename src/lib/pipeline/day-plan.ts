/**
 * Single-Day Content Planning
 *
 * Extracted from content-pipeline.ts — builds one day's content schedule
 * based on astrology data and the weekly cadence.
 */

import { SCENES, buildScenePrompt, type Scene } from "../scenes";
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
// Rotation arrays
// ---------------------------------------------------------------------------

const TUESDAY_CAROUSELS = ["tarot_meaning", "rune_reading"];
const THURSDAY_CAROUSELS = ["crystal_guide", "spell_guide", "chakra_guide"];
const SATURDAY_SINGLES = ["kitchen_witch", "tea_reading", "grimoire_page", "weekly_affirmation"];
const SUNDAY_CAROUSELS = ["zodiac_breakdown", "angel_number"];

const LIVING_ILLUSTRATION_SCENES = [
  "candle_magic",
  "full_moon",
  "crystal_of_the_day",
  "pendulum",
  "morning_ritual",
];

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

// ---------------------------------------------------------------------------
// Build a single day's plan
// ---------------------------------------------------------------------------

export function buildDayPlan(date: Date): DayPlan {
  const astro = getAstroContext(date);
  const posts: ScheduledPost[] = [];
  const day = astro.dayName;
  const seed = daySeed(date);

  if (day === "Monday") {
    posts.push(carousel("moon_guide"));
    posts.push(kontextStory("daily_oracle"));
    posts.push(kontextStory("moon_phase_checkin"));
    posts.push(kontextStory("morning_ritual"));
    posts.push(engagementStory("gratitude_check", ENGAGEMENT_STORY_CONFIG.gratitude_check.cta));
  }

  if (day === "Tuesday") {
    posts.push(carousel(TUESDAY_CAROUSELS[seed % TUESDAY_CAROUSELS.length]));
    posts.push(kontextStory("daily_card_pull"));
    posts.push(kontextStory("behind_the_scenes"));
    posts.push(kontextStory("moon_energy_update"));
    posts.push(engagementStory("ask_sammii", ENGAGEMENT_STORY_CONFIG.ask_sammii.cta));
  }

  if (day === "Wednesday") {
    posts.push(kontextStory("crystal_of_the_day"));
    posts.push(kontextStory("daily_oracle"));
    posts.push(engagementStory("poll_this_or_that", ENGAGEMENT_STORY_CONFIG.poll_this_or_that.cta));
    posts.push(engagementStory("zodiac_meme", ENGAGEMENT_STORY_CONFIG.zodiac_meme.cta));
    const tuesdayContentType = TUESDAY_CAROUSELS[seed % TUESDAY_CAROUSELS.length];
    posts.push(reelCarouselRecap("Tuesday", tuesdayContentType));
  }

  if (day === "Thursday") {
    posts.push(carousel(THURSDAY_CAROUSELS[seed % THURSDAY_CAROUSELS.length]));
    posts.push(kontextStory("crystal_of_the_day"));
    posts.push(kontextStory("morning_ritual"));
    posts.push(kontextStory("evening_wind_down"));
    posts.push(engagementStory("spell_tip", ENGAGEMENT_STORY_CONFIG.spell_tip.cta));
  }

  if (day === "Friday") {
    posts.push(kontextStory("daily_card_pull"));
    posts.push(kontextStory("behind_the_scenes"));
    posts.push(kontextStory("evening_wind_down"));
    posts.push(engagementStory("spell_tip", ENGAGEMENT_STORY_CONFIG.spell_tip.cta));
    const animScene = LIVING_ILLUSTRATION_SCENES[seed % LIVING_ILLUSTRATION_SCENES.length];
    if (isFalAvailable()) {
      posts.push(reelLivingIllustration(animScene));
    } else {
      posts.push(reelKenBurns(animScene));
    }
  }

  if (day === "Saturday") {
    const satScene = SATURDAY_SINGLES[seed % SATURDAY_SINGLES.length];
    posts.push(post(satScene, "feed"));
    posts.push(kontextStory("daily_oracle"));
    posts.push(kontextStory("moon_energy_update"));
    posts.push(engagementStory("poll_this_or_that", ENGAGEMENT_STORY_CONFIG.poll_this_or_that.cta));
  }

  if (day === "Sunday") {
    posts.push(carousel(SUNDAY_CAROUSELS[seed % SUNDAY_CAROUSELS.length]));
    posts.push(kontextStory("moon_phase_checkin"));
    posts.push(kontextStory("morning_ritual"));
    posts.push(kontextStory("evening_wind_down"));
    posts.push(engagementStory("gratitude_check", ENGAGEMENT_STORY_CONFIG.gratitude_check.cta));
  }

  // Sabbat override
  const nearSabbat = getSabbatNear(date, 2);
  if (nearSabbat) {
    posts.unshift(post("sabbat_altar", "feed"));
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
