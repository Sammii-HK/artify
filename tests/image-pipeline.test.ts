import { test } from "node:test";
import assert from "node:assert/strict";
import { createImagePipeline } from "../src/lib/pipeline/image-gen.ts";

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const image = (value: string) =>
  json({ data: [{ b64_json: Buffer.from(value).toString("base64") }] });
const verdict = (value: string) =>
  json({ choices: [{ message: { content: value } }] });
function harness(responses: Array<Response | Error>, token = "test-only") {
  const calls: string[] = [],
    writes = new Map<string, Buffer>();
  writes.set("output.png", Buffer.from("previous accepted output"));
  const pipeline = createImagePipeline({
    token: () => token,
    readImage: (path) =>
      path === "base.png"
        ? Buffer.from("base")
        : path === "missing.png"
          ? null
          : Buffer.from("candidate"),
    writeImage: (path, data) => writes.set(path, data),
    fetch: async (input) => {
      calls.push(String(input));
      const response = responses.shift();
      if (response instanceof Error) throw response;
      if (!response) throw new Error("Unexpected provider call");
      return response;
    },
  });
  return { pipeline, calls, writes };
}

test("missing token/image is skipped, never passed, and never calls a provider", async () => {
  for (const [path, token] of [
    ["base.png", ""],
    ["missing.png", "test"],
  ]) {
    const { pipeline, calls } = harness([], token);
    const result = await pipeline.validateFile(path);
    assert.equal(result.status, "skipped");
    assert.equal(result.pass, false);
    assert.equal(calls.length, 0);
  }
});
test("validation outage and unrecognisable verdict cannot pass", async () => {
  for (const response of [
    json({}, 503),
    json({ choices: [] }),
    verdict("PASSAGE is not a verdict"),
    new Error("offline"),
  ]) {
    const { pipeline } = harness([response]);
    const result = await pipeline.validateFile("base.png");
    assert.equal(result.status, "error");
    assert.equal(result.pass, false);
  }
});
test("a rejected candidate is not retained as success when retry fails or has no image", async () => {
  for (const retry of [
    json({}, 503),
    json({ data: [] }),
    new Error("offline"),
  ]) {
    const { pipeline, writes, calls } = harness([
      image("rejected"),
      verdict("FAIL extra finger"),
      retry,
    ]);
    const result = await pipeline.generate(
      "base.png",
      "portrait",
      "output.png",
    );
    assert.equal(result.status, "failed");
    assert.equal(result.outputPath, null);
    assert.equal(result.attempts, 2);
    assert.equal(
      writes.get("output.png")!.toString(),
      "previous accepted output",
    );
    assert.equal(calls.length, 3);
  }
});
test("validation failure on both attempts leaves any previous output untouched", async () => {
  const { pipeline, writes } = harness([
    image("first"),
    verdict("FAIL fingers"),
    image("second"),
    verdict("FAIL fingers"),
  ]);
  const result = await pipeline.generate("base.png", "portrait", "output.png");
  assert.equal(result.status, "failed");
  assert.equal(result.outputPath, null);
  assert.equal(
    writes.get("output.png")!.toString(),
    "previous accepted output",
  );
});
test("validation outage needs review and does not publish the unverified image or buy a retry", async () => {
  const { pipeline, writes, calls } = harness([
    image("candidate"),
    json({}, 503),
  ]);
  const result = await pipeline.generate("base.png", "portrait", "output.png");
  assert.equal(result.status, "needs-review");
  assert.equal(result.validation.status, "error");
  assert.equal(result.outputPath, null);
  assert.equal(calls.length, 2);
  assert.equal(
    writes.get("output.png")!.toString(),
    "previous accepted output",
  );
});
test("only an accepted retry replaces the output, using the fresh candidate", async () => {
  const { pipeline, writes } = harness([
    image("rejected"),
    verdict("FAIL fingers"),
    image("accepted"),
    verdict("PASS five fingers"),
  ]);
  const result = await pipeline.generate("base.png", "portrait", "output.png");
  assert.equal(result.status, "accepted");
  assert.equal(result.validation.status, "passed");
  assert.equal(result.attempts, 2);
  assert.equal(writes.get("output.png")!.toString(), "accepted");
});
test("explicitly disabled validation is recorded as unchecked, not passed", async () => {
  const { pipeline, calls } = harness([image("unchecked")]);
  const result = await pipeline.generate(
    "base.png",
    "portrait",
    "output.png",
    false,
  );
  assert.equal(result.status, "unchecked");
  assert.equal(result.validation.status, "skipped");
  assert.equal(result.validation.pass, false);
  assert.equal(calls.length, 1);
});
test("a failed image download is not saved as a PNG", async () => {
  const { pipeline, writes } = harness([
    json({ data: [{ url: "https://example.invalid/recorded.png" }] }),
    new Response("missing", { status: 404 }),
  ]);
  const result = await pipeline.generate(
    "base.png",
    "portrait",
    "output.png",
    false,
  );
  assert.equal(result.status, "failed");
  assert.equal(
    writes.get("output.png")!.toString(),
    "previous accepted output",
  );
});
