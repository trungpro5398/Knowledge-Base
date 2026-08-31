import assert from "node:assert/strict";
import test from "node:test";
import { searchQuerySchema } from "@kb/shared";

const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";

test("search query limits pagination and validates label IDs before SQL", () => {
  const parsed = searchQuerySchema.safeParse({
    q: "  handbook  ",
    tags: `${firstId},${secondId}`,
    page: "2",
    limit: "20",
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.q, "handbook");
  assert.deepEqual(parsed.data.tags?.split(","), [firstId, secondId]);
  assert.equal(parsed.data.page, 2);
  assert.equal(parsed.data.limit, 20);

  assert.equal(searchQuerySchema.safeParse({ page: "1.5" }).success, false);
  assert.equal(searchQuerySchema.safeParse({ tags: "not-a-uuid" }).success, false);
  assert.equal(searchQuerySchema.safeParse({ q: "" }).success, false);
  assert.equal(searchQuerySchema.safeParse({ q: "x" }).success, false);
  assert.equal(searchQuerySchema.safeParse({ q: "x".repeat(201) }).success, false);
});
