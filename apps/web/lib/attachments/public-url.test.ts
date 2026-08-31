import assert from "node:assert/strict";
import test from "node:test";
import { rewriteLegacyAttachmentUrl } from "./public-url.js";

test("rewrites legacy Supabase public attachment URLs through the access-checked proxy", () => {
  assert.equal(
    rewriteLegacyAttachmentUrl(
      "https://project.supabase.co/storage/v1/object/public/attachments/page-id/image%20one.png"
    ),
    "http://localhost:3001/api/public/attachments?path=page-id%2Fimage%20one.png"
  );
});

test("leaves non-attachment URLs unchanged", () => {
  assert.equal(rewriteLegacyAttachmentUrl("https://example.com/image.png"), "https://example.com/image.png");
});
