import fp from "fastify-plugin";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../db/pool.js";

type Role = "viewer" | "editor" | "admin";
const ROLE_HIERARCHY: Record<Role, number> = { viewer: 0, editor: 1, admin: 2 };

function hasMinRole(role: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
}

async function getMemberRole(userId: string, spaceId: string): Promise<Role | null> {
  const { rows } = await pool.query<{ role: Role }>(
    "SELECT role FROM memberships WHERE user_id = $1 AND space_id = $2",
    [userId, spaceId]
  );
  return rows[0]?.role ?? null;
}

async function getPageAccess(
  userId: string,
  pageId: string
): Promise<{ spaceId: string; role: Role | null; path: string; status: string } | null> {
  const { rows } = await pool.query<{ space_id: string; role: Role | null; path: string; status: string }>(
    `SELECT p.space_id, p.path::text as path, p.status, m.role
     FROM pages p
     LEFT JOIN memberships m ON m.space_id = p.space_id AND m.user_id = $1
     WHERE p.id = $2`,
    [userId, pageId]
  );
  const row = rows[0];
  if (!row) return null;
  return { spaceId: row.space_id, role: row.role ?? null, path: row.path, status: row.status };
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
  if (!hasMinRole(role, minRole)) {
    reply.status(403).send({ status: "error", message: `Requires ${minRole} role or higher` });
    return false;
  }
  (request as any).spaceRole = role;
  return true;
}

async function rbacPlugin(fastify: FastifyInstance) {
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
      const access = await getPageAccess(userId, pageId);
      if (!access) {
        reply.status(404).send({ status: "error", message: "Page not found" });
        return;
      }
      if (!access.role) {
        reply.status(403).send({ status: "error", message: "Not a member of this space" });
        return;
      }
      if (!hasMinRole(access.role, minRole)) {
        reply.status(403).send({ status: "error", message: `Requires ${minRole} role or higher` });
        return;
      }
      (request as any).spaceRole = access.role;
      request.pageMeta = { spaceId: access.spaceId, path: access.path, status: access.status };
    };
  });
}

export default fp(rbacPlugin, { name: "rbac", dependencies: ["auth"] });
