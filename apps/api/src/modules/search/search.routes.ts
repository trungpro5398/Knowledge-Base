import { FastifyInstance } from "fastify";
import * as searchRepo from "./search.repo.js";
import { searchQuerySchema } from "@kb/shared";

export async function searchRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/search",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = searchQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          status: "error",
          message: "Validation failed",
          errors: parsed.error.errors,
        });
      }
      const { q, space, tags, status, page, limit } = parsed.data;
      const tagIds = tags?.split(",").filter(Boolean);
      const userId = request.user!.id;
      const { results, total } = await searchRepo.search({
        userId,
        q,
        spaceId: space,
        labelIds: tagIds?.length ? tagIds : undefined,
        status,
        limit,
        offset: (page - 1) * limit,
      });
      return {
        data: results,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      };
    }
  );
}
