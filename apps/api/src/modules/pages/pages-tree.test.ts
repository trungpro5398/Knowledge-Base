import assert from "node:assert/strict";
import test from "node:test";
import { buildPagesTree } from "./pages-tree.js";
import type { PageRow } from "./pages.repo.js";

function page(id: string, parentId: string | null, sortOrder: number, path: string): PageRow {
  return {
    id,
    space_id: "space",
    parent_id: parentId,
    slug: id,
    path,
    title: id,
    status: "published",
    current_version_id: null,
    created_by: "user",
    updated_by: "user",
    created_at: new Date(0),
    updated_at: new Date(0),
    sort_order: sortOrder,
  };
}

test("buildPagesTree nests pages and applies deterministic sibling order", () => {
  const tree = buildPagesTree([
    page("second", null, 2, "second"),
    page("child-b", "first", 1, "first.child-b"),
    page("first", null, 1, "first"),
    page("child-a", "first", 1, "first.child-a"),
  ]);

  assert.deepEqual(tree.map((node) => node.id), ["first", "second"]);
  assert.deepEqual(tree[0]!.children.map((node) => node.id), ["child-a", "child-b"]);
});
