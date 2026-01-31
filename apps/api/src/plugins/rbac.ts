import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../db/pool.js";

type Role = "viewer" | "editor" | "admin";
const ROLE_HIERARCHY: Record<Role, number> = { viewer: 0, editor: 1, admin: 2 };

async function getMemberRole(userId: string, spaceId: string): Promise<Role | null> {
  if (!pool) {
    throw new Error("Database connection not available");
  }
  const { rows } = await pool.query<{ role: Role }>(
    "SELECT role FROM memberships WHERE user_id = $1 AND space_id = $2",
    [userId, spaceId]
  );
  return rows[0]?.role ?? null;
}

async function getPageSpaceId(pageId: string): Promise<string | null> {
  if (!pool) {
    throw new Error("Database connection not available");
  }
  const { rows } = await pool.query<{ space_id: string }>(
    "SELECT space_id FROM pages WHERE id = $1",
    [pageId]
  );
  return rows[0]?.space_id ?? null;
}

async function checkRole(
  userId: string,
  spaceId: string,
  minRole: Role,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<boolean> {
  const role = await getMemberRole(userId, spaceId);
  if (!role) {
    reply.status(403).send({ status: "error", message: "Not a member of this space" });
    return false;
  }
  if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minRole]) {
    reply.status(403).send({ status: "error", message: `Requires ${minRole} role or higher` });
    return false;
  }
  (request as any).spaceRole = role;
  return true;
}

export async function rbacPlugin(fastify: FastifyInstance) {
  fastify.decorate("requireSpaceRole", (minRole: Role) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.id;
      if (!userId) {
        reply.status(401).send({ status: "error", message: "Unauthorized" });
        return;
      }
      // Support spaceId from params or space_id from body
      const spaceId =
        (request.params as { spaceId?: string }).spaceId ??
        (request.body as { space_id?: string } | null)?.space_id;
      if (!spaceId) {
        reply.status(400).send({ status: "error", message: "Space ID required" });
        return;
      }
      const allowed = await checkRole(userId, spaceId, minRole, request, reply);
      if (!allowed) return;
    };
  });

  fastify.decorate("requirePageRole", (minRole: Role) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user?.id;
      if (!userId) {
        reply.status(401).send({ status: "error", message: "Unauthorized" });
        return;
      }
      const pageId = (request.params as { pageId?: string }).pageId ?? (request.params as { id?: string }).id;
      if (!pageId) {
        reply.status(400).send({ status: "error", message: "Page ID required" });
        return;
      }
      const spaceId = await getPageSpaceId(pageId);
      if (!spaceId) {
        reply.status(404).send({ status: "error", message: "Page not found" });
        return;
      }
      const allowed = await checkRole(userId, spaceId, minRole, request, reply);
      if (!allowed) return;
    };
  });
}
