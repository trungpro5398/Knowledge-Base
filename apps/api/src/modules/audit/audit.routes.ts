import { FastifyInstance } from "fastify";
import * as auditRepo from "./audit.repo.js";

export async function auditRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/audit",
    {
      preHandler: [
        fastify.authenticate,
        async (req, res) => {
          const spaceId = (req.query as { space?: string }).space;
          if (!spaceId) return res.status(400).send({ status: "error", message: "space is required" });
          await fastify.requireSpaceRole("admin").call(
            fastify,
            Object.assign(req, { params: { ...(req.params as object || {}), spaceId } }),
            res
          );
        },
      ],
    },
    async (request, reply) => {
      const query = request.query as {
        space: string;
        actor?: string;
        resource_type?: string;
        from?: string;
        to?: string;
        page?: string;
        limit?: string;
      };
      const spaceId = query.space;
      const page = Math.max(1, parseInt(query.page || "1", 10));
      const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10)));
      const { events, total } = await auditRepo.listAuditEvents({
        spaceId,
        actorId: query.actor,
        resourceType: query.resource_type,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
        limit,
        offset: (page - 1) * limit,
      });
      return {
        data: events,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      };
    }
  );
}
