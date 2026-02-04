import { FastifyInstance } from "fastify";
import type { AuthHandlers } from "./auth-types.js";
import { config } from "../config/env.js";
import { getMetricsSnapshot } from "../utils/metrics.js";
import { publicRoutes } from "../modules/public/public.routes.js";
import { organizationsRoutes } from "../modules/organizations/organizations.routes.js";
import { spacesRoutes } from "../modules/spaces/spaces.routes.js";
import { pagesRoutes } from "../modules/pages/pages.routes.js";
import { searchRoutes } from "../modules/search/search.routes.js";
import { auditRoutes } from "../modules/audit/audit.routes.js";
import { commentsRoutes } from "../modules/comments/comments.routes.js";
import { watchersRoutes } from "../modules/watchers/watchers.routes.js";
import { labelsRoutes } from "../modules/labels/labels.routes.js";
import { trashRoutes } from "../modules/trash/trash.routes.js";
import { attachmentsRoutes } from "../modules/attachments/attachments.routes.js";
import { membershipsRoutes } from "../modules/memberships/memberships.routes.js";
import { AppError, ValidationError } from "../utils/errors.js";

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.setErrorHandler((err, request, reply) => {
    const statusCode = typeof (err as any)?.statusCode === "number" ? (err as any).statusCode : undefined;
    if (err instanceof AppError) {
      const payload: Record<string, unknown> = { status: "error", message: err.message };
      if (err instanceof ValidationError && "errors" in err) payload.errors = (err as ValidationError & { errors?: unknown[] }).errors;
      return reply.status(err.statusCode).send(payload);
    }
    if (statusCode && statusCode >= 400 && statusCode < 600) {
      return reply.status(statusCode).send({ status: "error", message: err.message ?? "Request failed" });
    }
    request.log.error(err);
    return reply.status(500).send({ status: "error", message: "Internal server error" });
  });

  fastify.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));
  fastify.get("/metrics", async (request, reply) => {
    if (!config.metricsToken) {
      return reply.status(404).send();
    }
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, "");
    if (!token || token !== config.metricsToken) {
      return reply.status(401).send({ status: "error", message: "Unauthorized" });
    }
    return { data: getMetricsSnapshot() };
  });

  if (typeof fastify.authenticate !== "function") {
    throw new Error("Auth plugin must be registered before routes. Ensure authPlugin runs and decorates fastify.authenticate.");
  }
  const auth: AuthHandlers = {
    authenticate: fastify.authenticate,
    requireSpaceRole: fastify.requireSpaceRole,
    requirePageRole: fastify.requirePageRole,
  };

  await fastify.register(
    async (api) => {
      await api.register(publicRoutes, { prefix: "/public" });
      await api.register(async (instance) => { await organizationsRoutes(instance, auth); });
      await api.register(async (instance) => { await spacesRoutes(instance, auth); });
      await api.register(async (instance) => { await pagesRoutes(instance, auth); });
      await api.register(async (instance) => { await searchRoutes(instance, auth); });
      await api.register(async (instance) => { await auditRoutes(instance, auth); });
      await api.register(async (instance) => { await commentsRoutes(instance, auth); });
      await api.register(async (instance) => { await watchersRoutes(instance, auth); });
      await api.register(async (instance) => { await labelsRoutes(instance, auth); });
      await api.register(async (instance) => { await trashRoutes(instance, auth); });
      await api.register(async (instance) => { await attachmentsRoutes(instance, auth); });
      await api.register(async (instance) => { await membershipsRoutes(instance, auth); });
    },
    { prefix: "/api" }
  );
}
