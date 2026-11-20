#!/usr/bin/env node
/** Dry run is a read-only plan. Provider and credential code loads only on the live path. */
import { parseDailyOptions, previewDailyPlan } from "./daily-plan.ts";
import type { DailyOptions } from "./daily-plan.ts";

type CommandRuntime = {
  plan: (options: DailyOptions) => unknown | Promise<unknown>;
  generate: () => Promise<void>;
  write: (value: string) => void;
};

export async function runDailyCommand(
  args: string[],
  runtime?: CommandRuntime,
) {
  const options = parseDailyOptions(args);
  if (options.dryRun) {
    const plan = await (runtime?.plan ?? previewDailyPlan)(options);
    (runtime?.write ?? console.log)(JSON.stringify(plan, null, 2));
    return;
  }
  if (runtime) return runtime.generate();
  const { runLiveGeneration } = await import("./daily-generate-live.ts");
  await runLiveGeneration(options.dates);
}
