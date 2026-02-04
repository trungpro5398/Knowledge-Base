import type { FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    _startAt?: bigint;
  }
}

type RouteStats = {
  count: number;
  errorCount: number;
  totalMs: number;
  maxMs: number;
};

const routes = new Map<string, RouteStats>();
const total: RouteStats = { count: 0, errorCount: 0, totalMs: 0, maxMs: 0 };

function updateStats(stats: RouteStats, statusCode: number, durationMs: number) {
  stats.count += 1;
  if (statusCode >= 500) stats.errorCount += 1;
  stats.totalMs += durationMs;
  if (durationMs > stats.maxMs) stats.maxMs = durationMs;
}

export function recordRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  durationMs: number
): void {
  // Use routeOptions.url (new API) instead of routerPath (deprecated)
  const route = (request.routeOptions?.url as string | undefined) ?? request.url;
  const key = `${request.method} ${route}`;
  let stats = routes.get(key);
  if (!stats) {
    stats = { count: 0, errorCount: 0, totalMs: 0, maxMs: 0 };
    routes.set(key, stats);
  }
  updateStats(stats, reply.statusCode, durationMs);
  updateStats(total, reply.statusCode, durationMs);
}

function toSnapshot(stats: RouteStats) {
  return {
    count: stats.count,
    errorCount: stats.errorCount,
    avgMs: stats.count > 0 ? Math.round((stats.totalMs / stats.count) * 100) / 100 : 0,
    maxMs: Math.round(stats.maxMs * 100) / 100,
  };
}

export function getMetricsSnapshot() {
  const byRoute: Record<string, ReturnType<typeof toSnapshot>> = {};
  for (const [key, stats] of routes.entries()) {
    byRoute[key] = toSnapshot(stats);
  }

  return {
    timestamp: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
    memory: {
      rss: process.memoryUsage().rss,
      heapUsed: process.memoryUsage().heapUsed,
      heapTotal: process.memoryUsage().heapTotal,
    },
    requests: {
      total: toSnapshot(total),
      byRoute,
    },
  };
}
