import { FastifyInstance } from "fastify";
import type { AuthHandlers } from "../../routes/auth-types.js";
import * as labelsRepo from "./labels.repo.js";

export async function labelsRoutes(fastify: FastifyInstance, auth: AuthHandlers) {
  const { authenticate, requireSpaceRole } = auth;
  fastify.get(
    "/spaces/:spaceId/labels",
    { preHandler: [authenticate, requireSpaceRole("viewer")] },
    async (request, reply) => {
      const { spaceId } = request.params as { spaceId: string };
      const labels = await labelsRepo.listBySpace(spaceId);
      return { data: labels };
    }
  );

  fastify.post(
    "/spaces/:spaceId/labels",
    { preHandler: [authenticate, requireSpaceRole("editor")] },
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
