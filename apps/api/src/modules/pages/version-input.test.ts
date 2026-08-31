import assert from "node:assert/strict";
import test from "node:test";
import { createVersionSchema } from "@kb/shared";

test("version input requires content and caps markdown before creating a database row", () => {
  assert.equal(createVersionSchema.safeParse({}).success, false);
  assert.equal(createVersionSchema.safeParse({ summary: "Autosave" }).success, false);
  assert.equal(createVersionSchema.safeParse({ content_md: null }).success, false);
  assert.equal(createVersionSchema.safeParse({ content_md: "" }).success, true);
  assert.equal(createVersionSchema.safeParse({ content_json: {} }).success, true);
  assert.equal(createVersionSchema.parse({ content_md: "draft", draft_update: true }).draft_update, true);
  assert.equal(createVersionSchema.parse({ content_md: "draft" }).draft_update, false);
  assert.equal(createVersionSchema.safeParse({ content_md: "x".repeat(1_000_001) }).success, false);
});
