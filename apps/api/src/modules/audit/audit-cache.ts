import { TtlCache } from "../../utils/ttl-cache.js";
import { config } from "../../config/env.js";
import * as auditRepo from "./audit.repo.js";
import type { AuditEventRow } from "./audit.repo.js";

const DEFAULT_TTL_MS = Math.max(0, config.internalCacheTtlMs);
const MAX_ENTRIES = Math.max(1, config.internalCacheMaxEntries || 500);

type AuditResponse = { events: AuditEventRow[]; total: number };

const cache = new TtlCache<AuditResponse>({
  defaultTtlMs: DEFAULT_TTL_MS,
  maxEntries: MAX_ENTRIES,
});
const inflight = new Map<string, Promise<AuditResponse>>();

function makeKey(params: {
  spaceId: string;
  actorId?: string;
  resourceType?: string;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
}): string {
  const from = params.from ? params.from.toISOString() : "";
  const to = params.to ? params.to.toISOString() : "";
  const actor = params.actorId ?? "";
  const resource = params.resourceType ?? "";
  return `audit:${params.spaceId}:${actor}:${resource}:${from}:${to}:${params.limit}:${params.offset}`;
}

export async function listAuditEventsCached(params: {
  spaceId: string;
  actorId?: string;
  resourceType?: string;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
}): Promise<AuditResponse> {
  if (DEFAULT_TTL_MS <= 0) return auditRepo.listAuditEvents(params);
  const key = makeKey(params);
  const cached = cache.get(key);
  if (cached) return cached;
  const inflightReq = inflight.get(key);
  if (inflightReq) return inflightReq;

  const promise = (async () => {
    const result = await auditRepo.listAuditEvents(params);
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
