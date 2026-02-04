import { TtlCache } from "../../utils/ttl-cache.js";
import { config } from "../../config/env.js";
import * as searchRepo from "./search.repo.js";
import type { SearchResult } from "./search.repo.js";

const DEFAULT_TTL_MS = Math.max(0, config.internalCacheTtlMs);
const MAX_ENTRIES = Math.max(1, config.internalCacheMaxEntries || 500);

type SearchResponse = { results: SearchResult[]; total: number };

const cache = new TtlCache<SearchResponse>({
  defaultTtlMs: DEFAULT_TTL_MS,
  maxEntries: MAX_ENTRIES,
});
const inflight = new Map<string, Promise<SearchResponse>>();

function makeKey(params: {
  userId: string;
  q?: string;
  spaceId?: string;
  labelIds?: string[];
  status?: string;
  limit: number;
  offset: number;
}): string {
  const labels = params.labelIds?.slice().sort().join(",") ?? "";
  const q = params.q?.trim() ?? "";
  const space = params.spaceId ?? "";
  const status = params.status ?? "";
  return `search:${params.userId}:${space}:${status}:${labels}:${q}:${params.limit}:${params.offset}`;
}

export async function searchCached(params: {
  userId: string;
  q?: string;
  spaceId?: string;
  labelIds?: string[];
  status?: string;
  limit: number;
  offset: number;
}): Promise<SearchResponse> {
  if (DEFAULT_TTL_MS <= 0) return searchRepo.search(params);
  const key = makeKey(params);
  const cached = cache.get(key);
  if (cached) return cached;
  const inflightReq = inflight.get(key);
  if (inflightReq) return inflightReq;

  const promise = (async () => {
    const result = await searchRepo.search(params);
    cache.set(key, result);
    return result;
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}
