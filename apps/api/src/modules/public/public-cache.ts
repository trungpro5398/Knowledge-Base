import * as pagesRepo from "../pages/pages.repo.js";
import * as searchRepo from "../search/search.repo.js";
import * as spacesRepo from "../spaces/spaces.repo.js";
import { config } from "../../config/env.js";
import { TtlCache } from "../../utils/ttl-cache.js";
import { buildPagesTree, type PageNode } from "../pages/pages-tree.js";
import type { PageRow, PageVersionRow, PublicTreePageRow } from "../pages/pages.repo.js";

const SIGNED_URL_TTL_MS = Math.min(Math.max(0, config.publicCacheTtlMs), 240_000);
const MAX_ENTRIES = Math.max(1, config.publicCacheMaxEntries || 200);
const signedAttachmentUrlCache = new TtlCache<string>({
  defaultTtlMs: SIGNED_URL_TTL_MS,
  maxEntries: MAX_ENTRIES,
});
const inflightSignedAttachmentUrls = new Map<string, Promise<string | null>>();

export type PublicPageTreeNode = Pick<
  PageRow,
  "id" | "parent_id" | "slug" | "path" | "title" | "status" | "sort_order"
> & { children: PublicPageTreeNode[] };

export type PublicPage = Pick<
  PageRow,
  "id" | "parent_id" | "slug" | "path" | "title" | "status" | "sort_order"
> & {
  version?: Pick<
    PageVersionRow,
    "id" | "page_id" | "content_md" | "content_json" | "summary" | "rendered_html" | "toc_json" | "created_at"
  >;
};

export function toPublicTree(nodes: PageNode<PublicTreePageRow>[]): PublicPageTreeNode[] {
  return nodes.map((node) => ({
    id: node.id,
    parent_id: node.parent_id,
    slug: node.slug,
    path: node.path,
    title: node.title,
    status: node.status,
    sort_order: node.sort_order,
    children: toPublicTree(node.children),
  }));
}

export function toPublicPage(
  page: Awaited<ReturnType<typeof pagesRepo.getPageByPath>>
): PublicPage | null {
  if (!page) return null;
  const version = page.version;
  return {
    id: page.id,
    parent_id: page.parent_id,
    slug: page.slug,
    path: page.path,
    title: page.title,
    status: page.status,
    sort_order: page.sort_order,
    version: version
      ? {
          id: version.id,
          page_id: version.page_id,
          // Published HTML is the canonical, sanitized render. Avoid sending
          // the near-duplicate markdown payload unless a legacy row needs the
          // client-side fallback renderer.
          content_md: version.rendered_html ? null : version.content_md,
          content_json: version.content_json,
          summary: version.summary,
          rendered_html: version.rendered_html,
          toc_json: version.toc_json,
          created_at: version.created_at,
        }
      : undefined,
  };
}

export async function getPublicSpacesCached() {
  return spacesRepo.listPublicSpaces();
}

export async function searchPublicCached(params: {
  q: string;
  spaceSlug?: string;
  limit: number;
  offset: number;
}) {
  return searchRepo.searchPublic(params);
}

/**
 * Reauthorize publication on every request, then cache only the expensive
 * signed-URL minting step. A cached bearer URL is never returned unless the
 * current database state still allows the attachment.
 */
export async function getPublicAttachmentUrlCached(
  path: string,
  authorize: () => Promise<string | null>,
  sign: (authorizedPath: string) => Promise<string | null>
): Promise<string | null> {
  const authorizedPath = await authorize();
  if (!authorizedPath || authorizedPath !== path) return null;
  if (SIGNED_URL_TTL_MS <= 0) return sign(authorizedPath);

  const key = `attachment-signature:${authorizedPath}`;
  const cached = signedAttachmentUrlCache.get(key);
  if (cached) return cached;
  const inflight = inflightSignedAttachmentUrls.get(key);
  if (inflight) return inflight;

  const promise = sign(authorizedPath).then((url) => {
    if (url) signedAttachmentUrlCache.set(key, url, SIGNED_URL_TTL_MS);
    return url;
  });
  inflightSignedAttachmentUrls.set(key, promise);
  try {
    return await promise;
  } finally {
    if (inflightSignedAttachmentUrls.get(key) === promise) {
      inflightSignedAttachmentUrls.delete(key);
    }
  }
}

function buildTitleMap(tree: PublicPageTreeNode[]): Map<string, string> {
  const map = new Map<string, string>();
  const stack = [...tree];
  while (stack.length > 0) {
    const node = stack.pop()!;
    map.set(node.path, node.title);
    if (node.children && node.children.length > 0) {
      stack.push(...node.children);
    }
  }
  return map;
}

function computeTreeEtagFromPages(pages: { updated_at: Date }[]): string {
  let maxUpdated = 0;
  for (const page of pages) {
    const ts = page.updated_at instanceof Date ? page.updated_at.getTime() : new Date(page.updated_at).getTime();
    if (ts > maxUpdated) maxUpdated = ts;
  }
  return `${pages.length}:${maxUpdated}`;
}

export async function getPublishedTreeCached(
  spaceId: string,
  _ttlMs?: number
) {
  const pages = await pagesRepo.getPublishedPagesTree(spaceId);
  const tree = toPublicTree(buildPagesTree(pages));
  return {
    tree,
    pageTitleByPath: buildTitleMap(tree),
    etag: computeTreeEtagFromPages(pages),
  };
}

export async function getPublishedPageByPathCached(
  spaceId: string,
  path: string,
  _ttlMs?: number
) {
  return pagesRepo.getPageByPath(spaceId, path);
}

export function invalidatePublishedSpace(_spaceId: string): void {
  // Public authorization-sensitive reads intentionally bypass process-local
  // caches. There is nothing instance-local to invalidate.
}

export function invalidatePublishedPage(_spaceId: string, _path: string): void {
  // Kept as a stable service boundary for callers; see above.
}
