import { FastifyInstance } from "fastify";
import type { AuthHandlers } from "../../routes/auth-types.js";
import * as trashRepo from "./trash.repo.js";
import * as pagesRepo from "../../modules/pages/pages.repo.js";
import { invalidatePublishedSpace } from "../public/public-cache.js";

export async function trashRoutes(fastify: FastifyInstance, auth: AuthHandlers) {
  const { authenticate, requirePageRole } = auth;
  fastify.get(
    "/trash",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user!.id;
      const items = await trashRepo.listTrash(userId);
      return { data: items };
    }
  );

  fastify.post(
    "/trash/:pageId/restore",
    { preHandler: [authenticate, requirePageRole("editor")] },
    async (request, reply) => {
      const { pageId } = request.params as { pageId: string };
      await pagesRepo.restoreFromTrash(pageId);
      if (request.pageMeta?.status === "published") {
        invalidatePublishedSpace(request.pageMeta.spaceId);
      }
      return reply.status(204).send();
    }
  );

  fastify.delete(
    "/trash/:pageId",
    { preHandler: [authenticate, requirePageRole("editor")] },
    async (request, reply) => {
      const { pageId } = request.params as { pageId: string };
      const inTrash = await trashRepo.isInTrash(pageId);
      if (!inTrash) {
        return reply.status(404).send({ status: "error", message: "Page not found in trash" });
      }

      await pagesRepo.deletePageSubtree(pageId);
      if (request.pageMeta?.status === "published") {
        invalidatePublishedSpace(request.pageMeta.spaceId);
      }
      return reply.status(204).send();
    }
  );
}
