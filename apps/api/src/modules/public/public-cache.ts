import * as pagesRepo from "../pages/pages.repo.js";
import * as pagesService from "../pages/pages.service.js";
import { TtlCache } from "../../utils/ttl-cache.js";
import { config } from "../../config/env.js";
import type { PageRow } from "../pages/pages.repo.js";

type TreeNode = PageRow & { children: TreeNode[] };

const DEFAULT_TTL_MS = Math.max(0, config.publicCacheTtlMs);
const MAX_ENTRIES = Math.max(1, config.publicCacheMaxEntries || 200);

const treeCache = new TtlCache<{
  tree: TreeNode[];
  pageTitleByPath: Map<string, string>;
}>({ defaultTtlMs: DEFAULT_TTL_MS, maxEntries: MAX_ENTRIES });

const pageCache = new TtlCache<Awaited<ReturnType<typeof pagesRepo.getPageByPath>>>(
  { defaultTtlMs: DEFAULT_TTL_MS, maxEntries: MAX_ENTRIES }
);

function buildTitleMap(tree: TreeNode[]): Map<string, string> {
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

export async function getPublishedTreeCached(
  spaceId: string,
  ttlMs = DEFAULT_TTL_MS
) {
  if (ttlMs <= 0) {
    const tree = (await pagesService.getPagesTree(spaceId, {
      publishedOnly: true,
    })) as TreeNode[];
    return { tree, pageTitleByPath: buildTitleMap(tree) };
  }
  const key = `tree:${spaceId}`;
  const cached = treeCache.get(key);
  if (cached) return cached;

  const tree = (await pagesService.getPagesTree(spaceId, {
    publishedOnly: true,
  })) as TreeNode[];
  const pageTitleByPath = buildTitleMap(tree);
  const value = { tree, pageTitleByPath };
  treeCache.set(key, value, ttlMs);
  return value;
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

  const page = await pagesRepo.getPageByPath(spaceId, path);
  if (page) {
    pageCache.set(key, page, ttlMs);
  }
  return page;
}

export function invalidatePublishedSpace(spaceId: string): void {
  treeCache.delete(`tree:${spaceId}`);
}
