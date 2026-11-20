import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sceneRequests,
  resultImage,
  validateUpload,
} from "../src/lib/studio.ts";

test("custom scenes create one request when the selection is cleared", () => {
  assert.deepEqual(sceneRequests([], "  A quiet autumn garden  ", {}), [
    {
      key: "custom",
      label: "Custom scene",
      customPrompt: "A quiet autumn garden",
    },
  ]);
  assert.deepEqual(sceneRequests([], "  ", {}), []);
  assert.deepEqual(sceneRequests(["garden"], "ignored", { garden: "Garden" }), [
    { key: "garden", label: "Garden", scene: "garden" },
  ]);
});
test("an empty or unsafe provider result cannot become a successful image", () => {
  for (const value of [
    null,
    {},
    { data: [] },
    { data: [{ url: "javascript:alert(1)" }] },
  ])
    assert.throws(() => resultImage(value), /no usable image/);
  assert.equal(
    resultImage({ data: [{ url: "https://example.test/result.png" }] }),
    "https://example.test/result.png",
  );
  assert.equal(
    resultImage({ data: [{ b64_json: "Zm9v" }] }),
    "data:image/png;base64,Zm9v",
  );
});
test("uploads reject oversized and non-image input, including HEIC without a MIME type", () => {
  assert.throws(
    () =>
      validateUpload({
        size: 21 * 1024 * 1024,
        type: "image/png",
        name: "large.png",
      }),
    /20 MB/,
  );
  assert.throws(
    () => validateUpload({ size: 10, type: "text/plain", name: "text.txt" }),
    /Choose a/,
  );
  assert.doesNotThrow(() =>
    validateUpload({ size: 10, type: "", name: "photo.HEIC" }),
  );
});
