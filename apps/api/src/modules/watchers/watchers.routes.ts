import { FastifyInstance } from "fastify";
import type { AuthHandlers } from "../../routes/auth-types.js";
import * as watchersRepo from "./watchers.repo.js";

export async function watchersRoutes(fastify: FastifyInstance, auth: AuthHandlers) {
  fastify.post(
    "/pages/:id/watchers",
    { preHandler: [auth.authenticate, auth.requirePageRole("viewer")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as { watch?: boolean };
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
