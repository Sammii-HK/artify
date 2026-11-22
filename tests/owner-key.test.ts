import { test } from "node:test";
import assert from "node:assert/strict";
import { ownerAllowed } from "../src/lib/owner-key.ts";

test("paid generation is off when no owner key is configured", () => {
  assert.equal(ownerAllowed("anything", undefined), false);
  assert.equal(ownerAllowed("anything", ""), false);
});

test("only the exact owner key is allowed", () => {
  assert.equal(ownerAllowed("correct-key", "correct-key"), true);
  assert.equal(ownerAllowed(null, "correct-key"), false);
  assert.equal(ownerAllowed("", "correct-key"), false);
  assert.equal(ownerAllowed("correct-ke", "correct-key"), false);
  assert.equal(ownerAllowed("correct-key-and-more", "correct-key"), false);
});
