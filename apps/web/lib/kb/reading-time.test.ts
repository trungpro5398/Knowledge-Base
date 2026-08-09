import assert from "node:assert/strict";
import test from "node:test";
import { estimateReadingMinutes } from "./reading-time";

test("estimates reading time from Vietnamese and English prose", () => {
  assert.equal(estimateReadingMinutes("quy trình vận hành tài liệu"), 1);
  assert.equal(estimateReadingMinutes(Array.from({ length: 221 }, () => "word").join(" ")), 2);
});

test("ignores markup, URLs, code blocks, scripts, and styles", () => {
  const source = [
    "<h2>Useful heading</h2>",
    "[Open the guide](https://example.com/a/very/long/path)",
    "```ts\nconst hidden = true;\n```",
    "<script>const hidden = true;</script>",
    "<style>.hidden { display: none }</style>",
  ].join("\n");

  assert.equal(estimateReadingMinutes(source), 1);
});
