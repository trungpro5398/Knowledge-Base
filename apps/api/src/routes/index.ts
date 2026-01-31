import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { spacesRoutes } from "../modules/spaces/spaces.routes.js";
import { pagesRoutes } from "../modules/pages/pages.routes.js";
import { searchRoutes } from "../modules/search/search.routes.js";
import { auditRoutes } from "../modules/audit/audit.routes.js";
import { commentsRoutes } from "../modules/comments/comments.routes.js";
import { watchersRoutes } from "../modules/watchers/watchers.routes.js";
import { labelsRoutes } from "../modules/labels/labels.routes.js";
import { trashRoutes } from "../modules/trash/trash.routes.js";
import { attachmentsRoutes } from "../modules/attachments/attachments.routes.js";
import { AppError, ValidationError } from "../utils/errors.js";

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.setErrorHandler((err, request, reply) => {
    if (err instanceof AppError) {
      const payload: Record<string, unknown> = { status: "error", message: err.message };
      if (err instanceof ValidationError && "errors" in err) payload.errors = (err as ValidationError & { errors?: unknown[] }).errors;
      return reply.status(err.statusCode).send(payload);
    }
    request.log.error(err);
    return reply.status(500).send({ status: "error", message: "Internal server error" });
  });

  fastify.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // Capture auth handlers from root (encapsulated child does not inherit decorators)
  const authenticate = fastify.authenticate;
  const requireSpaceRole = fastify.requireSpaceRole;
  const requirePageRole = fastify.requirePageRole;

  await fastify.register(
    async (api) => {
      api.decorate("authenticate", authenticate);
      api.decorate("requireSpaceRole", requireSpaceRole);
      api.decorate("requirePageRole", requirePageRole);
      // Use fastify-plugin so route plugins run in same context and see the decorators
      await api.register(fp(spacesRoutes));
      await api.register(fp(pagesRoutes));
      await api.register(fp(searchRoutes));
      await api.register(fp(auditRoutes));
      await api.register(fp(commentsRoutes));
      await api.register(fp(watchersRoutes));
      await api.register(fp(labelsRoutes));
      await api.register(fp(trashRoutes));
      await api.register(fp(attachmentsRoutes));
    },
    { prefix: "/api" }
  );
}
