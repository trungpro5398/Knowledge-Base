import { FastifyInstance } from "fastify";
import * as trashRepo from "./trash.repo.js";
import * as pagesRepo from "../../modules/pages/pages.repo.js";

export async function trashRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/trash",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user!.id;
      const items = await trashRepo.listTrash(userId);
      return { data: items };
    }
  );

  fastify.post(
    "/trash/:pageId/restore",
    { preHandler: [fastify.authenticate, fastify.requirePageRole("editor")] },
    async (request, reply) => {
      const { pageId } = request.params as { pageId: string };
      await pagesRepo.restoreFromTrash(pageId);
      return reply.status(204).send();
    }
  );
}
