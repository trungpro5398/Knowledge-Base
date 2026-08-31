import assert from "node:assert/strict";
import test from "node:test";
import { MAX_ATTACHMENT_SIZE_BYTES, validateAttachmentFile } from "./validation.js";

test("attachment validation mirrors browser upload limits", () => {
  assert.equal(validateAttachmentFile({ type: "image/png", size: MAX_ATTACHMENT_SIZE_BYTES }), null);
  assert.match(
    validateAttachmentFile({ type: "image/png", size: MAX_ATTACHMENT_SIZE_BYTES + 1 }) ?? "",
    /10 MB/
  );
  assert.match(
    validateAttachmentFile({ type: "application/zip", size: 10 }) ?? "",
    /không được hỗ trợ/
  );
});
