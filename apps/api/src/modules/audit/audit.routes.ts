import { FastifyInstance } from "fastify";
import type { AuthHandlers } from "../../routes/auth-types.js";
import { listAuditEventsCached } from "./audit-cache.js";
import { z } from "zod";

const auditQuerySchema = z
  .object({
    space: z.string().uuid(),
    actor: z.string().uuid().optional(),
    resource_type: z.string().trim().min(1).max(100).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "from must be before to",
    path: ["to"],
  });

export async function auditRoutes(fastify: FastifyInstance, auth: AuthHandlers) {
  const { authenticate, requireSpaceRole } = auth;
  fastify.get(
    "/audit",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
      preHandler: [
        authenticate,
        async (req, res) => {
          const parsed = auditQuerySchema.safeParse(req.query);
          if (!parsed.success) {
            return res.status(400).send({
              status: "error",
              message: "Validation failed",
              errors: parsed.error.errors,
            });
          }
          const spaceId = parsed.data.space;
          await requireSpaceRole("admin")(Object.assign(req, { params: { ...(req.params as object || {}), spaceId } }) as any, res);
        },
      ],
    },
    async (request) => {
      // The pre-handler has already validated this input. Parse again rather
      // than replacing Fastify's request.query object, whose mutability is not
      // part of the request contract.
      const query = auditQuerySchema.parse(request.query);
      const spaceId = query.space;
      const page = query.page;
      const limit = query.limit;
      const { events, total } = await listAuditEventsCached({
        spaceId,
        actorId: query.actor,
        resourceType: query.resource_type,
        from: query.from,
        to: query.to,
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
