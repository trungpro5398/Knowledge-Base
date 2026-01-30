import { FastifyInstance } from "fastify";
import * as labelsRepo from "./labels.repo.js";

export async function labelsRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/spaces/:spaceId/labels",
    { preHandler: [fastify.authenticate, fastify.requireSpaceRole("viewer")] },
    async (request, reply) => {
      const { spaceId } = request.params as { spaceId: string };
      const labels = await labelsRepo.listBySpace(spaceId);
      return { data: labels };
    }
  );

  fastify.post(
    "/spaces/:spaceId/labels",
    { preHandler: [fastify.authenticate, fastify.requireSpaceRole("editor")] },
    async (request, reply) => {
      const { spaceId } = request.params as { spaceId: string };
      const body = request.body as { name: string; color?: string };
      if (!body.name?.trim()) {
        return reply.status(400).send({ status: "error", message: "name is required" });
      }
      const label = await labelsRepo.create(spaceId, body.name.trim(), body.color);
      return reply.status(201).send({ data: label });
    }
  );
}
