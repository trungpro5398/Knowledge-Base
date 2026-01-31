import { FastifyInstance } from "fastify";
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
  // Copy auth decorators to child context (encapsulation can block inheritance)
  await fastify.register(
    async (child) => {
      child.decorate("authenticate", fastify.authenticate);
      child.decorate("requireSpaceRole", fastify.requireSpaceRole);
      child.decorate("requirePageRole", fastify.requirePageRole);
      await child.register(spacesRoutes);
      await child.register(pagesRoutes);
      await child.register(searchRoutes);
      await child.register(auditRoutes);
      await child.register(commentsRoutes);
      await child.register(watchersRoutes);
      await child.register(labelsRoutes);
      await child.register(trashRoutes);
      await child.register(attachmentsRoutes);
    },
    { prefix: "/api" }
  );
}
