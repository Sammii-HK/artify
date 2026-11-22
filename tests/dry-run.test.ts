import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { runDailyCommand } from "../scripts/daily-command.ts";
import { parseDailyOptions } from "../scripts/daily-plan.ts";

test("dry run cannot enter generation, even with live-only flags", async () => {
  let planned = 0,
    generated = 0;
  let output = "";
  await runDailyCommand(
    ["--dry-run", "--no-validate", "--no-video", "--date", "2026-11-20"],
    {
      plan: () => {
        planned++;
        return { mode: "plan-only" };
      },
      generate: async () => {
        generated++;
      },
      write: (value) => {
        output = value;
      },
    },
  );
  assert.equal(planned, 1);
  assert.equal(generated, 0);
  assert.equal(JSON.parse(output).mode, "plan-only");
});
test("invalid or misspelled options fail before generation", async () => {
  for (const args of [
    ["--dryrun"],
    ["--date"],
    ["--dry-run", "--date", "2026-02-31"],
  ]) {
    let generated = 0;
    await assert.rejects(
      runDailyCommand(args, {
        plan: () => ({}),
        generate: async () => {
          generated++;
        },
        write: () => {},
      }),
    );
    assert.equal(generated, 0);
  }
});
test("weekly dates use the same upcoming Monday as the live command", () => {
  const options = parseDailyOptions([
    "--week",
    "--dry-run",
    "--date",
    "2026-11-20",
  ]);
  assert.equal(options.dates[0].toISOString().slice(0, 10), "2026-11-23");
  assert.equal(options.dates.length, 7);
});
test("actual dry CLI produces a plan with network, env loading and writes forbidden", () => {
  const child = spawnSync(
    process.execPath,
    [
      "--import",
      "./tests/dry-run-guard.mjs",
      "./scripts/daily-generate.ts",
      "--dry-run",
      "--date",
      "2026-11-20",
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout);
  assert.equal(result.mode, "plan-only");
  assert.equal(result.generated, false);
  assert.equal(result.validated, false);
  assert.equal(result.uploaded, false);
  assert.equal(result.scheduled, false);
  assert.ok(result.days[0].posts.length > 0);
  assert.ok(
    result.days[0].posts.every(
      (post: { validation: string }) => post.validation === "not-run",
    ),
  );
});
