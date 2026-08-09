import assert from "node:assert/strict";
import test from "node:test";
import { compileMarkdown } from "./markdown.js";

test("compileMarkdown keeps Vietnamese, formatted and duplicate heading anchors aligned", async () => {
  const result = await compileMarkdown([
    "# Tài liệu mẫu",
    "## Quy trình **xử lý**",
    "## Quy trình xử lý",
  ].join("\n"));

  assert.deepEqual(result.toc, [
    { id: "user-content-tai-lieu-mau", text: "Tài liệu mẫu", level: 1 },
    { id: "user-content-quy-trinh-xu-ly", text: "Quy trình xử lý", level: 2 },
    { id: "user-content-quy-trinh-xu-ly-2", text: "Quy trình xử lý", level: 2 },
  ]);
  for (const item of result.toc) {
    assert.match(result.html, new RegExp(`id="${item.id}"`));
  }
});
