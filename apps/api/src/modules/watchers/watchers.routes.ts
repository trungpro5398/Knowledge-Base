import { FastifyInstance } from "fastify";
import type { AuthHandlers } from "../../routes/auth-types.js";
import * as watchersRepo from "./watchers.repo.js";
import { z } from "zod";

const updateWatcherSchema = z.object({ watch: z.boolean().optional() }).strict();

export async function watchersRoutes(fastify: FastifyInstance, auth: AuthHandlers) {
  fastify.post(
    "/pages/:id/watchers",
    {
      preHandler: [auth.authenticate, auth.requirePageRole("viewer")],
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updateWatcherSchema.safeParse(
        request.body === undefined ? {} : request.body
      );
      if (!parsed.success) {
        return reply.status(400).send({
          status: "error",
          message: "Validation failed",
          errors: parsed.error.errors,
        });
      }
      const body = parsed.data;
      const userId = request.user!.id;
      if (body.watch !== false) {
        await watchersRepo.addWatcher(id, userId);
      } else {
        await watchersRepo.removeWatcher(id, userId);
      }
      return { data: { watching: body.watch !== false } };
    }
  );
}
