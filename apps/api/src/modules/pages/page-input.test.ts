import assert from "node:assert/strict";
import test from "node:test";
import { createPageSchema, updatePageSchema } from "@kb/shared";

test("page slugs remain a single ltree label", () => {
  assert.equal(
    createPageSchema.safeParse({
      space_id: "00000000-0000-4000-8000-000000000001",
      title: "Nested URL",
      slug: "parent/child",
    }).success,
    false
  );
  assert.equal(updatePageSchema.safeParse({ slug: "valid-slug_2" }).success, true);
});

test("single-page sort updates use the same bounds as bulk reorder", () => {
  assert.equal(updatePageSchema.safeParse({ sort_order: -1 }).success, false);
  assert.equal(updatePageSchema.safeParse({ sort_order: 1_000_001 }).success, false);
  assert.equal(updatePageSchema.safeParse({ sort_order: 1_000_000 }).success, true);
});
