import { TtlCache } from "../../utils/ttl-cache.js";
import { config } from "../../config/env.js";
import * as spacesRepo from "./spaces.repo.js";
import type { SpaceRow, SpaceStats } from "./spaces.repo.js";

const DEFAULT_TTL_MS = Math.max(0, config.internalCacheTtlMs);
const MAX_ENTRIES = Math.max(1, config.internalCacheMaxEntries || 500);

const listCache = new TtlCache<SpaceRow[]>({ defaultTtlMs: DEFAULT_TTL_MS, maxEntries: MAX_ENTRIES });
const statsCache = new TtlCache<SpaceStats[]>({ defaultTtlMs: DEFAULT_TTL_MS, maxEntries: MAX_ENTRIES });

const inflightList = new Map<string, Promise<SpaceRow[]>>();
const inflightStats = new Map<string, Promise<SpaceStats[]>>();

export async function getSpacesForUserCached(userId: string): Promise<SpaceRow[]> {
  if (DEFAULT_TTL_MS <= 0) return spacesRepo.listSpacesForUser(userId);
  const key = `spaces:list:${userId}`;
  const cached = listCache.get(key);
  if (cached) return cached;
  const inflight = inflightList.get(key);
  if (inflight) return inflight;

  const promise = (async () => {
    const spaces = await spacesRepo.listSpacesForUser(userId);
    listCache.set(key, spaces);
    return spaces;
  })();

  inflightList.set(key, promise);
  try {
    return await promise;
  } finally {
    inflightList.delete(key);
  }
}

export async function getSpacesStatsCached(userId: string): Promise<SpaceStats[]> {
  if (DEFAULT_TTL_MS <= 0) return spacesRepo.getSpacesStats(userId);
  const key = `spaces:stats:${userId}`;
  const cached = statsCache.get(key);
  if (cached) return cached;
  const inflight = inflightStats.get(key);
  if (inflight) return inflight;

  const promise = (async () => {
    const stats = await spacesRepo.getSpacesStats(userId);
    statsCache.set(key, stats);
    return stats;
  })();

  inflightStats.set(key, promise);
  try {
    return await promise;
  } finally {
    inflightStats.delete(key);
  }
}

export function invalidateSpacesForUser(userId: string): void {
  listCache.delete(`spaces:list:${userId}`);
  statsCache.delete(`spaces:stats:${userId}`);
}
