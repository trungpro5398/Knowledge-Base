import { FastifyInstance } from "fastify";
import type { AuthHandlers } from "../../routes/auth-types.js";
import { searchCached } from "./search-cache.js";
import { searchQuerySchema } from "@kb/shared";

export async function searchRoutes(fastify: FastifyInstance, auth: AuthHandlers) {
  fastify.get(
    "/search",
    { preHandler: [auth.authenticate] },
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
      const { results, total } = await searchCached({
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
