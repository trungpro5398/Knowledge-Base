import * as pagesRepo from "../pages/pages.repo.js";
import { TtlCache } from "../../utils/ttl-cache.js";
import { config } from "../../config/env.js";
import { buildPagesTree, type PageNode } from "../pages/pages-tree.js";

const DEFAULT_TTL_MS = Math.max(0, config.publicCacheTtlMs);
const MAX_ENTRIES = Math.max(1, config.publicCacheMaxEntries || 200);

const treeCache = new TtlCache<{
  tree: PageNode[];
  pageTitleByPath: Map<string, string>;
  etag: string;
}>({ defaultTtlMs: DEFAULT_TTL_MS, maxEntries: MAX_ENTRIES });

const pageCache = new TtlCache<Awaited<ReturnType<typeof pagesRepo.getPageByPath>>>({
  defaultTtlMs: DEFAULT_TTL_MS,
  maxEntries: MAX_ENTRIES,
});

const inflightTree = new Map<
  string,
  Promise<{ tree: PageNode[]; pageTitleByPath: Map<string, string>; etag: string }>
>();
const inflightPage = new Map<string, Promise<Awaited<ReturnType<typeof pagesRepo.getPageByPath>>>>();

function buildTitleMap(tree: PageNode[]): Map<string, string> {
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
  ttlMs = DEFAULT_TTL_MS
) {
  const currentEtag = await pagesRepo.getPublishedTreeEtag(spaceId);
  const key = `tree:${spaceId}`;
  const cached = treeCache.get(key);
  if (cached && cached.etag === currentEtag) return cached;
  const inflight = inflightTree.get(key);
  if (inflight) return inflight;

  const promise = (async () => {
    const pages = await pagesRepo.getPagesTree(spaceId, { publishedOnly: true });
    const tree = buildPagesTree(pages);
    const pageTitleByPath = buildTitleMap(tree);
    const value = { tree, pageTitleByPath, etag: computeTreeEtagFromPages(pages) };
    treeCache.set(key, value, ttlMs);
    return value;
  })();

  inflightTree.set(key, promise);
  try {
    return await promise;
  } finally {
    inflightTree.delete(key);
  }
}

export async function getPublishedPageByPathCached(
  spaceId: string,
  path: string,
  ttlMs = DEFAULT_TTL_MS
) {
  if (ttlMs <= 0) {
    return pagesRepo.getPageByPath(spaceId, path);
  }
  const key = `page:${spaceId}:${path}`;
  const cached = pageCache.get(key);
  if (cached) return cached;
  const inflight = inflightPage.get(key);
  if (inflight) return inflight;

  const promise = (async () => {
    const page = await pagesRepo.getPageByPath(spaceId, path);
    if (page) {
      pageCache.set(key, page, ttlMs);
    }
    return page;
  })();

  inflightPage.set(key, promise);
  try {
    return await promise;
  } finally {
    inflightPage.delete(key);
  }
}

export function invalidatePublishedSpace(spaceId: string): void {
  treeCache.delete(`tree:${spaceId}`);
  const prefix = `page:${spaceId}:`;
  for (const key of pageCache.keys()) {
    if (key.startsWith(prefix)) {
      pageCache.delete(key);
    }
  }
}

export function invalidatePublishedPage(spaceId: string, path: string): void {
  pageCache.delete(`page:${spaceId}:${path}`);
}
