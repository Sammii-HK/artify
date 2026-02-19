import { MoonPhase, Illumination, Body, GeoVector } from "astronomy-engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MoonInfo {
  name: string;
  illumination: number;
  /** 0-360 ecliptic longitude difference (0=new, 180=full) */
  phase: number;
  emoji: string;
  /** Named full moon (e.g. "Wolf Moon") — null when not a full moon */
  fullMoonName: string | null;
  /** True when the full moon is at perigee (<360,000 km) */
  isSupermoon: boolean;
}

export interface ZodiacInfo {
  sign: string;
  symbol: string;
}

export interface Sabbat {
  name: string;
  month: number;
  day: number;
  theme: string;
  style: string;
}

export interface EclipseInfo {
  date: string;
  type: "Penumbral Lunar Eclipse" | "Total Solar Eclipse" | "Partial Lunar Eclipse" | "Annular Solar Eclipse";
  sign: string;
  theme: string;
}

export interface RetroInfo {
  start: string;
  end: string;
  signFrom: string;
  signTo: string;
  /** Whether we're currently inside the retrograde period */
  active: boolean;
  /** Day number within the retrograde (1-based), or 0 if upcoming */
  dayNumber: number;
}

export interface AstroContext {
  date: string;
  dayName: string;
  moon: MoonInfo;
  zodiac: ZodiacInfo;
  sabbat: Sabbat | null;
  eclipse: EclipseInfo | null;
  mercuryRetrograde: RetroInfo | null;
}

// ---------------------------------------------------------------------------
// Sabbats — Wheel of the Year
// ---------------------------------------------------------------------------

export const SABBATS: readonly Sabbat[] = [
  { name: "Imbolc",  month: 2,  day: 1,  theme: "renewal, first light, Brigid",                    style: "imbolc"  },
  { name: "Ostara",  month: 3,  day: 20, theme: "spring equinox, balance, new growth",              style: "ostara"  },
  { name: "Beltane", month: 5,  day: 1,  theme: "fertility, passion, fire",                         style: "beltane" },
  { name: "Litha",   month: 6,  day: 21, theme: "summer solstice, peak power, sun",                 style: "litha"   },
  { name: "Lammas",  month: 8,  day: 1,  theme: "first harvest, gratitude, bread",                  style: "lammas"  },
  { name: "Mabon",   month: 9,  day: 22, theme: "autumn equinox, balance, harvest",                 style: "mabon"   },
  { name: "Samhain", month: 10, day: 31, theme: "ancestors, veil thinning, shadow",                 style: "samhain" },
  { name: "Yule",    month: 12, day: 21, theme: "winter solstice, rebirth of light, longest night", style: "yule"    },
] as const;

// ---------------------------------------------------------------------------
// Named Full Moons
// ---------------------------------------------------------------------------

const FULL_MOON_NAMES: Record<number, string> = {
  1:  "Wolf Moon",
  2:  "Snow Moon",
  3:  "Worm Moon",
  4:  "Pink Moon",
  5:  "Flower Moon",
  6:  "Strawberry Moon",
  7:  "Buck Moon",
  8:  "Sturgeon Moon",
  9:  "Harvest Moon",
  10: "Hunter Moon",
  11: "Beaver Moon",
  12: "Cold Moon",
};

// ---------------------------------------------------------------------------
// Moon phase
// ---------------------------------------------------------------------------

const MOON_PHASES: { max: number; name: string; emoji: string }[] = [
  { max: 22.5,  name: "New Moon",        emoji: "\u{1F311}" },
  { max: 67.5,  name: "Waxing Crescent", emoji: "\u{1F312}" },
  { max: 112.5, name: "First Quarter",   emoji: "\u{1F313}" },
  { max: 157.5, name: "Waxing Gibbous",  emoji: "\u{1F314}" },
  { max: 202.5, name: "Full Moon",       emoji: "\u{1F315}" },
  { max: 247.5, name: "Waning Gibbous",  emoji: "\u{1F316}" },
  { max: 292.5, name: "Last Quarter",    emoji: "\u{1F317}" },
  { max: 337.5, name: "Waning Crescent", emoji: "\u{1F318}" },
];

/** Calculate Moon-Earth distance in km using astronomy-engine */
function getMoonDistanceKm(date: Date): number {
  const vec = GeoVector(Body.Moon, date, true);
  // GeoVector returns AU — convert to km (1 AU = 149597870.7 km)
  const distAU = Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
  return distAU * 149597870.7;
}

export function getMoonPhase(date: Date): MoonInfo {
  const phase = MoonPhase(date);
  const illum = Illumination(Body.Moon, date);

  let name = "New Moon";
  let emoji = "\u{1F311}";
  for (const p of MOON_PHASES) {
    if (phase < p.max) {
      name = p.name;
      emoji = p.emoji;
      break;
    }
  }
  // > 337.5 wraps back to New Moon (already the default)

  const isFull = name === "Full Moon";
  const fullMoonName = isFull ? (FULL_MOON_NAMES[date.getMonth() + 1] ?? null) : null;
  const isSupermoon = isFull && getMoonDistanceKm(date) < 360000;

  return {
    name,
    illumination: Math.round(illum.phase_fraction * 1000) / 10,
    phase: Math.round(phase * 100) / 100,
    emoji,
    fullMoonName,
    isSupermoon,
  };
}

// ---------------------------------------------------------------------------
// Zodiac season (sun sign)
// ---------------------------------------------------------------------------

const ZODIAC_SEASONS: [number, number, string, string][] = [
  [1,  20, "Aquarius",    "\u2652"],
  [2,  19, "Pisces",      "\u2653"],
  [3,  21, "Aries",       "\u2648"],
  [4,  20, "Taurus",      "\u2649"],
  [5,  21, "Gemini",      "\u264A"],
  [6,  21, "Cancer",      "\u264B"],
  [7,  23, "Leo",         "\u264C"],
  [8,  23, "Virgo",       "\u264D"],
  [9,  23, "Libra",       "\u264E"],
  [10, 23, "Scorpio",     "\u264F"],
  [11, 22, "Sagittarius", "\u2650"],
  [12, 22, "Capricorn",   "\u2651"],
];

export function getZodiacSeason(date: Date): ZodiacInfo {
  const m = date.getMonth() + 1;
  const d = date.getDate();

  // Walk backwards through the transition dates to find the current sign
  for (let i = ZODIAC_SEASONS.length - 1; i >= 0; i--) {
    const [sm, sd, sign, symbol] = ZODIAC_SEASONS[i];
    if (m > sm || (m === sm && d >= sd)) {
      return { sign, symbol };
    }
  }
  // Before Jan 20 → Capricorn
  return { sign: "Capricorn", symbol: "\u2651" };
}

// ---------------------------------------------------------------------------
// Sabbat proximity
// ---------------------------------------------------------------------------

export function getSabbatNear(date: Date, windowDays = 7): Sabbat | null {
  const year = date.getFullYear();
  for (const sabbat of SABBATS) {
    const sDate = new Date(year, sabbat.month - 1, sabbat.day);
    const diff = Math.abs(
      (date.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff <= windowDays) return sabbat;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Eclipses — 2026 calendar
// ---------------------------------------------------------------------------

const ECLIPSES_2026: EclipseInfo[] = [
  { date: "2026-02-17", type: "Penumbral Lunar Eclipse",  sign: "Virgo",    theme: "shadow integration, purification, release of perfectionism" },
  { date: "2026-03-03", type: "Total Solar Eclipse",      sign: "Pisces",   theme: "spiritual rebirth, dissolving boundaries, collective healing" },
  { date: "2026-08-12", type: "Partial Lunar Eclipse",    sign: "Aquarius", theme: "liberation, breaking patterns, community awakening" },
  { date: "2026-09-07", type: "Annular Solar Eclipse",    sign: "Virgo",    theme: "harvest of intentions, sacred service, detailed transformation" },
];

export function getEclipseNear(date: Date, windowDays = 3): EclipseInfo | null {
  const dateStr = date.toISOString().slice(0, 10);
  const dateMs = date.getTime();

  for (const eclipse of ECLIPSES_2026) {
    const eclipseMs = new Date(eclipse.date + "T00:00:00").getTime();
    const diffDays = Math.abs(dateMs - eclipseMs) / (1000 * 60 * 60 * 24);
    if (diffDays <= windowDays) return eclipse;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Mercury Retrograde — 2026 periods
// ---------------------------------------------------------------------------

const MERCURY_RETROGRADES_2026: RetroInfo[] = [
  { start: "2026-03-15", end: "2026-04-07", signFrom: "Aries",       signTo: "Pisces",    active: false, dayNumber: 0 },
  { start: "2026-07-18", end: "2026-08-11", signFrom: "Leo",         signTo: "Cancer",    active: false, dayNumber: 0 },
  { start: "2026-11-09", end: "2026-11-29", signFrom: "Sagittarius", signTo: "Scorpio",   active: false, dayNumber: 0 },
];

export function getMercuryRetrograde(date: Date): RetroInfo | null {
  const dateMs = date.getTime();
  const DAY_MS = 1000 * 60 * 60 * 24;

  for (const retro of MERCURY_RETROGRADES_2026) {
    const startMs = new Date(retro.start + "T00:00:00").getTime();
    const endMs = new Date(retro.end + "T00:00:00").getTime();

    if (dateMs >= startMs && dateMs <= endMs) {
      const dayNumber = Math.floor((dateMs - startMs) / DAY_MS) + 1;
      return { ...retro, active: true, dayNumber };
    }

    // Show upcoming retrograde if within 7 days
    const daysUntil = (startMs - dateMs) / DAY_MS;
    if (daysUntil > 0 && daysUntil <= 7) {
      return { ...retro, active: false, dayNumber: 0 };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Combined context
// ---------------------------------------------------------------------------

export function getAstroContext(date: Date): AstroContext {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return {
    date: date.toISOString().slice(0, 10),
    dayName: days[date.getDay()],
    moon: getMoonPhase(date),
    zodiac: getZodiacSeason(date),
    sabbat: getSabbatNear(date),
    eclipse: getEclipseNear(date),
    mercuryRetrograde: getMercuryRetrograde(date),
  };
}
