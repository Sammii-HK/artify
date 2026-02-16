import { MoonPhase, Illumination, Body } from "astronomy-engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MoonInfo {
  name: string;
  illumination: number;
  /** 0-360 ecliptic longitude difference (0=new, 180=full) */
  phase: number;
  emoji: string;
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

export interface AstroContext {
  date: string;
  dayName: string;
  moon: MoonInfo;
  zodiac: ZodiacInfo;
  sabbat: Sabbat | null;
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

  return {
    name,
    illumination: Math.round(illum.phase_fraction * 1000) / 10,
    phase: Math.round(phase * 100) / 100,
    emoji,
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
  };
}
