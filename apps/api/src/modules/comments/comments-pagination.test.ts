import assert from "node:assert/strict";
import test from "node:test";
import { decodeCommentCursor, encodeCommentCursor } from "./comments-pagination.js";

const commentId = "11111111-1111-4111-8111-111111111111";

test("comment cursor round-trips and rejects malformed input", () => {
  const cursor = encodeCommentCursor("2026-08-12T00:00:00.123456Z", commentId);
  assert.deepEqual(decodeCommentCursor(cursor), {
    createdAt: "2026-08-12T00:00:00.123456Z",
    id: commentId,
  });
  assert.equal(decodeCommentCursor("not-a-cursor"), null);
});
