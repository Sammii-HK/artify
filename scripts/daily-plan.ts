import { buildDayPlan } from "../src/lib/pipeline/day-plan.ts";

export interface DailyOptions {
  dryRun: boolean;
  dates: Date[];
}

export function parseDailyOptions(
  args: string[],
  now = new Date(),
): DailyOptions {
  let date: string | undefined;
  let week = false,
    dryRun = false;
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === "--dry-run") dryRun = true;
    else if (flag === "--week") week = true;
    else if (flag === "--no-video" || flag === "--no-validate") {
      /* live-only preferences */
    } else if (
      flag === "--date" &&
      args[index + 1] &&
      !args[index + 1].startsWith("--")
    )
      date = args[++index];
    else throw new Error(`Unknown or incomplete option: ${flag}`);
  }
  let start = date
    ? new Date(date + "T00:00:00Z")
    : new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
      );
  if (
    date &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(start.getTime()) ||
      start.toISOString().slice(0, 10) !== date)
  )
    throw new Error("Use a real date in YYYY-MM-DD form.");
  if (week) {
    if (date)
      start.setUTCDate(
        start.getUTCDate() +
          (start.getUTCDay() === 1 ? 0 : (8 - start.getUTCDay()) % 7),
      );
    else {
      start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      start.setUTCDate(
        start.getUTCDate() +
          (start.getUTCDay() === 1 ? 0 : (8 - start.getUTCDay()) % 7),
      );
    }
  }
  return {
    dryRun,
    dates: Array.from(
      { length: week ? 7 : 1 },
      (_, index) => new Date(start.getTime() + index * 86400000),
    ),
  };
}

export function previewDailyPlan(options: DailyOptions) {
  return {
    mode: "plan-only",
    generated: false,
    validated: false,
    uploaded: false,
    scheduled: false,
    note: "No provider, rendering, upload or scheduling calls were made. Living-video provider availability is not checked in this preview.",
    days: options.dates.map((date) => {
      const plan = buildDayPlan(date, { livingIllustrationsAvailable: false });
      return {
        date: date.toISOString().slice(0, 10),
        dayName: plan.astro.dayName,
        moon: plan.astro.moon.name,
        zodiac: plan.astro.zodiac.sign,
        posts: plan.posts.map((post) => ({
          sceneKey: post.sceneKey,
          label: post.scene.label,
          slot: post.slot,
          format: post.format,
          validation: "not-run",
        })),
      };
    }),
  };
}
