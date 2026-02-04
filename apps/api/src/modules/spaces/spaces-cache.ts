import { TtlCache } from "../../utils/ttl-cache.js";
import { config } from "../../config/env.js";
import * as spacesRepo from "./spaces.repo.js";
import type { SpaceRow } from "./spaces.repo.js";

const DEFAULT_TTL_MS = Math.max(0, config.publicCacheTtlMs);
const MAX_ENTRIES = Math.max(1, config.publicCacheMaxEntries || 200);

const slugCache = new TtlCache<SpaceRow>({ defaultTtlMs: DEFAULT_TTL_MS, maxEntries: MAX_ENTRIES });
const idCache = new TtlCache<SpaceRow>({ defaultTtlMs: DEFAULT_TTL_MS, maxEntries: MAX_ENTRIES });

const inflightSlug = new Map<string, Promise<SpaceRow | null>>();
const inflightId = new Map<string, Promise<SpaceRow | null>>();

export async function getSpaceBySlugCached(slug: string): Promise<SpaceRow | null> {
  if (DEFAULT_TTL_MS <= 0) return spacesRepo.getSpaceBySlug(slug);
  const key = `space:slug:${slug}`;
  const cached = slugCache.get(key);
  if (cached) return cached;
  const inflight = inflightSlug.get(key);
  if (inflight) return inflight;

  const promise = (async () => {
    const space = await spacesRepo.getSpaceBySlug(slug);
    if (space) {
      slugCache.set(key, space);
      idCache.set(`space:id:${space.id}`, space);
    }
    return space;
  })();

  inflightSlug.set(key, promise);
  try {
    return await promise;
  } finally {
    inflightSlug.delete(key);
  }
}

export async function getSpaceByIdCached(id: string): Promise<SpaceRow | null> {
  if (DEFAULT_TTL_MS <= 0) return spacesRepo.getSpaceById(id);
  const key = `space:id:${id}`;
  const cached = idCache.get(key);
  if (cached) return cached;
  const inflight = inflightId.get(key);
  if (inflight) return inflight;

  const promise = (async () => {
    const space = await spacesRepo.getSpaceById(id);
    if (space) {
      idCache.set(key, space);
      slugCache.set(`space:slug:${space.slug}`, space);
    }
    return space;
  })();

  inflightId.set(key, promise);
  try {
    return await promise;
  } finally {
    inflightId.delete(key);
  }
}

export function invalidateSpaceCache(id?: string, slug?: string): void {
  if (id) idCache.delete(`space:id:${id}`);
  if (slug) slugCache.delete(`space:slug:${slug}`);
}
