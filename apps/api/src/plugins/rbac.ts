import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../db/pool.js";
import { ForbiddenError } from "../utils/errors.js";

type Role = "viewer" | "editor" | "admin";

async function getMemberRole(userId: string, spaceId: string): Promise<Role | null> {
  if (!pool) return null;
  const { rows } = await pool.query<{ role: Role }>(
    "SELECT role FROM memberships WHERE user_id = $1 AND space_id = $2",
    [userId, spaceId]
  );
  return rows[0]?.role ?? null;
}

async function getPageSpaceId(pageId: string): Promise<string | null> {
  if (!pool) return null;
  const { rows } = await pool.query<{ space_id: string }>(
    "SELECT space_id FROM pages WHERE id = $1",
    [pageId]
  );
  return rows[0]?.space_id ?? null;
}

function checkRole(userId: string, spaceId: string, minRole: Role) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const role = await getMemberRole(userId, spaceId);
    if (!role) throw new ForbiddenError("Not a member of this space");
    const hierarchy = { viewer: 0, editor: 1, admin: 2 };
    if (hierarchy[role] < hierarchy[minRole]) {
      throw new ForbiddenError(`Requires ${minRole} role or higher`);
    }
    (request as any).spaceRole = role;
  };
}

export async function rbacPlugin(fastify: FastifyInstance) {
  fastify.decorate("requireSpaceRole", (minRole: Role) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.id;
      if (!userId) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      const spaceId = (request.params as { spaceId?: string }).spaceId;
      if (!spaceId) return reply.status(400).send({ status: "error", message: "Space ID required" });
      await checkRole(userId, spaceId, minRole)(request, reply);
    };
  });

  fastify.decorate("requirePageRole", (minRole: Role) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.id;
      if (!userId) return reply.status(401).send({ status: "error", message: "Unauthorized" });
      const pageId = (request.params as { pageId?: string }).pageId ?? (request.params as { id?: string }).id;
      if (!pageId) return reply.status(400).send({ status: "error", message: "Page ID required" });
      const spaceId = await getPageSpaceId(pageId);
      if (!spaceId) return reply.status(404).send({ status: "error", message: "Page not found" });
      await checkRole(userId, spaceId, minRole)(request, reply);
    };
  });
}
