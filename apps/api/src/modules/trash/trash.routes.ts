import { FastifyInstance } from "fastify";
import type { AuthHandlers } from "../../routes/auth-types.js";
import * as trashRepo from "./trash.repo.js";
import * as pagesService from "../../modules/pages/pages.service.js";
import { cleanupAttachmentStorage } from "../attachments/attachment-storage.js";

export async function trashRoutes(fastify: FastifyInstance, auth: AuthHandlers) {
  const { authenticate } = auth;
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
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { pageId } = request.params as { pageId: string };
      await pagesService.restorePage(pageId, request.user!.id);
      return reply.status(204).send();
    }
  );

  fastify.delete(
    "/trash/:pageId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { pageId } = request.params as { pageId: string };
      const result = await pagesService.purgePage(pageId, request.user!.id);
      if ((result.queued_object_count ?? 0) > 0) {
        await cleanupAttachmentStorage(request.log, { force: true });
      }
      return reply.status(204).send();
    }
  );
}
