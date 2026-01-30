import { FastifyInstance } from "fastify";
import * as commentsRepo from "./comments.repo.js";
import { createCommentSchema } from "@kb/shared";

export async function commentsRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/pages/:id/comments",
    { preHandler: [fastify.authenticate, fastify.requirePageRole("viewer")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const comments = await commentsRepo.listByPage(id);
      return { data: comments };
    }
  );

  fastify.post(
    "/pages/:id/comments",
    { preHandler: [fastify.authenticate, fastify.requirePageRole("viewer")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = createCommentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          status: "error",
          message: "Validation failed",
          errors: parsed.error.errors,
        });
      }
      const userId = request.user!.id;
      const comment = await commentsRepo.create({
        pageId: id,
        versionId: parsed.data.version_id ?? null,
        parentId: parsed.data.parent_id ?? null,
        content: parsed.data.content,
        authorId: userId,
      });
      return reply.status(201).send({ data: comment });
    }
  );
}
