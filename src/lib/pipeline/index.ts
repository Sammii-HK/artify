export { buildDayPlan, buildWeeklyCalendar, daySeed, ENGAGEMENT_STORY_CONFIG } from "./day-plan";
export type { ScheduledPost, DayPlan } from "./day-plan";

export type { EclipseInfo, RetroInfo } from "../astro";

export { generateImage, validateHands, getBaseForPalette, getBaseForContext, PALETTE_TO_STYLE } from "./image-gen";

export {
  generateCaption,
  generateCarouselCaption,
  generateStoryText,
  generatePlatformVariants,
  inferContentTopic,
  getOpeningStyle,
  getLunaryHint,
} from "./caption-gen";
export type { PlatformCaptions } from "./caption-gen";

export { SpellcastClient } from "./spellcast-client";
export type { AccountSet, UploadedMedia, CreatedPost } from "./spellcast-client";
