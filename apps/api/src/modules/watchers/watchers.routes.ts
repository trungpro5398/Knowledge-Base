import { FastifyInstance } from "fastify";
import * as watchersRepo from "./watchers.repo.js";

export async function watchersRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/pages/:id/watchers",
    { preHandler: [fastify.authenticate, fastify.requirePageRole("viewer")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = request.body as { watch?: boolean };
      const userId = request.user!.id;
      if (body.watch !== false) {
        await watchersRepo.addWatcher(id, userId);
      } else {
        await watchersRepo.removeWatcher(id, userId);
      }
      const watching = await watchersRepo.isWatching(id, userId);
      return { data: { watching } };
    }
  );
}
