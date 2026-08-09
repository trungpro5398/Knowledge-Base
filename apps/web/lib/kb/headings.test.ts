import assert from "node:assert/strict";
import test from "node:test";
import { extractMarkdownToc } from "./headings";

test("extracts an on-page outline with stable unique anchors", () => {
  assert.deepEqual(
    extractMarkdownToc([
      "# Page title",
      "## Tổng quan",
      "### Chi tiết",
      "## Tổng quan",
      "## Đường dẫn",
      "paragraph",
    ].join("\n")),
    [
      { id: "user-content-tong-quan", text: "Tổng quan", level: 2 },
      { id: "user-content-chi-tiet", text: "Chi tiết", level: 3 },
      { id: "user-content-tong-quan-2", text: "Tổng quan", level: 2 },
      { id: "user-content-duong-dan", text: "Đường dẫn", level: 2 },
    ]
  );
});
