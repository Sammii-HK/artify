#!/usr/bin/env node
/** Plan-only runs never load the live generator or its credential loader. */
import { runDailyCommand } from "./daily-command.ts";
runDailyCommand(process.argv.slice(2)).catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Daily command failed.",
  );
  process.exitCode = 1;
});
