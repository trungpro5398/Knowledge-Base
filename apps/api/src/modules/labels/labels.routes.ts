import { FastifyInstance } from "fastify";
import type { AuthHandlers } from "../../routes/auth-types.js";
import * as labelsRepo from "./labels.repo.js";
import { z } from "zod";

const createLabelSchema = z.object({
  name: z.string().trim().min(1).max(100),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
}).strict();

export async function labelsRoutes(fastify: FastifyInstance, auth: AuthHandlers) {
  const { authenticate, requireSpaceRole } = auth;
  fastify.get(
    "/spaces/:spaceId/labels",
    { preHandler: [authenticate, requireSpaceRole("editor")] },
    async (request, reply) => {
      const { spaceId } = request.params as { spaceId: string };
      const labels = await labelsRepo.listBySpace(spaceId);
      return { data: labels };
    }
  );

  fastify.post(
    "/spaces/:spaceId/labels",
    {
      preHandler: [authenticate, requireSpaceRole("editor")],
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { spaceId } = request.params as { spaceId: string };
      const parsed = createLabelSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          status: "error",
          message: "Validation failed",
          errors: parsed.error.errors,
        });
      }
      const label = await labelsRepo.create(spaceId, parsed.data.name, parsed.data.color);
      return reply.status(201).send({ data: label });
    }
  );
}
