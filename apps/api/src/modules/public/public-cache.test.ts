import assert from "node:assert/strict";
import test from "node:test";
import {
  getPublicAttachmentUrlCached,
  toPublicPage,
  toPublicTree,
} from "./public-cache.js";
import type { PageNode } from "../pages/pages-tree.js";

const pageNode: PageNode = {
  id: "page",
  space_id: "space",
  parent_id: null,
  slug: "public-page",
  path: "public_page",
  title: "Public page",
  status: "published",
  sort_order: 1,
  current_version_id: "draft-version",
  published_version_id: "published-version",
  created_by: "private-creator",
  updated_by: "private-editor",
  created_at: new Date(0),
  updated_at: new Date(0),
  children: [],
};

test("public page DTOs omit editor identifiers and draft pointers", () => {
  const tree = toPublicTree([pageNode]);
  assert.deepEqual(tree, [{
    id: "page",
    parent_id: null,
    slug: "public-page",
    path: "public_page",
    title: "Public page",
    status: "published",
    sort_order: 1,
    children: [],
  }]);

  const page = toPublicPage({
    ...pageNode,
    version: {
      id: "published-version",
      page_id: "page",
      content_md: "# Public",
      content_json: null,
      summary: "summary",
      rendered_html: "<h1>Public</h1>",
      toc_json: [],
      created_by: "private-creator",
      created_at: new Date(0),
    },
  });

  assert.ok(page);
  assert.equal("created_by" in page, false);
  assert.equal("updated_by" in page, false);
  assert.equal("current_version_id" in page, false);
  assert.equal("created_by" in (page.version ?? {}), false);
  assert.equal(page?.version?.content_md, null);
  assert.equal(page?.version?.rendered_html, "<h1>Public</h1>");

  const legacyPage = toPublicPage({
    ...pageNode,
    version: {
      id: "legacy-version",
      page_id: "page",
      content_md: "# Legacy",
      content_json: null,
      summary: null,
      rendered_html: null,
      toc_json: [],
      created_by: "private-creator",
      created_at: new Date(0),
    },
  });
  assert.equal(legacyPage?.version?.content_md, "# Legacy");
});

test("public attachments reauthorize every request while sharing signed URLs", async () => {
  let authorizeCalls = 0;
  let signCalls = 0;
  const path = `${crypto.randomUUID()}/${crypto.randomUUID()}-image.png`;
  const authorize = async () => {
    authorizeCalls += 1;
    return path;
  };
  const sign = async () => {
    signCalls += 1;
    return "https://storage.example/signed";
  };
  const [first, second] = await Promise.all([
    getPublicAttachmentUrlCached(path, authorize, sign),
    getPublicAttachmentUrlCached(path, authorize, sign),
  ]);
  const cached = await getPublicAttachmentUrlCached(path, authorize, sign);
  assert.equal(first, "https://storage.example/signed");
  assert.equal(second, "https://storage.example/signed");
  assert.equal(cached, "https://storage.example/signed");
  assert.equal(authorizeCalls, 3);
  assert.equal(signCalls, 1);
});

test("publication revocation blocks a previously cached signed URL", async () => {
  let authorizeCalls = 0;
  let signCalls = 0;
  const path = `${crypto.randomUUID()}/${crypto.randomUUID()}-revoked.png`;
  const authorize = async () => {
    authorizeCalls += 1;
    return authorizeCalls === 1 ? path : null;
  };
  const sign = async () => {
    signCalls += 1;
    return "https://storage.example/old-signed";
  };
  assert.equal(await getPublicAttachmentUrlCached(path, authorize, sign), "https://storage.example/old-signed");
  assert.equal(await getPublicAttachmentUrlCached(path, authorize, sign), null);
  assert.equal(authorizeCalls, 2);
  assert.equal(signCalls, 1);
});

test("concurrent attachment requests never share authorization decisions", async () => {
  let resolveFirst!: (value: string | null) => void;
  const first = new Promise<string | null>((resolve) => {
    resolveFirst = resolve;
  });
  let authorizeCalls = 0;
  let signCalls = 0;
  const path = `${crypto.randomUUID()}/${crypto.randomUUID()}-racing.png`;
  const authorize = async () => {
    authorizeCalls += 1;
    return authorizeCalls === 1 ? first : null;
  };
  const sign = async () => {
    signCalls += 1;
    return "https://storage.example/signed";
  };
  const pending = getPublicAttachmentUrlCached(path, authorize, sign);
  const afterRevocation = getPublicAttachmentUrlCached(path, authorize, sign);
  resolveFirst(path);
  assert.deepEqual(await Promise.all([pending, afterRevocation]), [
    "https://storage.example/signed",
    null,
  ]);
  assert.equal(authorizeCalls, 2);
  assert.equal(signCalls, 1);
});
