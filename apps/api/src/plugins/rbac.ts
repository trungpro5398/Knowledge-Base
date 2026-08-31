import fp from "fastify-plugin";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../db/pool.js";

type Role = "viewer" | "editor" | "admin";
const ROLE_HIERARCHY: Record<Role, number> = { viewer: 0, editor: 1, admin: 2 };

function hasMinRole(role: Role, minRole: Role): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
}

async function getMemberRole(userId: string, spaceId: string): Promise<Role | null> {
  const { rows } = await pool.query<{ direct_role: Role | null; organization_role: string | null }>(
    `SELECT m.role AS direct_role, om.role AS organization_role
     FROM spaces s
     LEFT JOIN memberships m ON m.space_id = s.id AND m.user_id = $1
     LEFT JOIN organization_memberships om
       ON om.organization_id = s.organization_id AND om.user_id = $1
     WHERE s.id = $2`,
    [userId, spaceId]
  );
  const row = rows[0];
  if (row?.direct_role) return row.direct_role;
  if (row?.organization_role === "admin" || row?.organization_role === "owner") return "admin";
  if (row?.organization_role === "member") return "viewer";
  return null;
}

async function getPageAccess(
  userId: string,
  pageId: string,
  includeTrashed = false
): Promise<{ spaceId: string; role: Role | null; path: string; status: string } | null> {
  const { rows } = await pool.query<{
    space_id: string;
    direct_role: Role | null;
    organization_role: string | null;
    path: string;
    status: string;
  }>(
    `SELECT p.space_id, p.path::text as path, p.status,
            m.role AS direct_role, om.role AS organization_role
     FROM pages p
     JOIN spaces s ON s.id = p.space_id
     LEFT JOIN trash t ON t.page_id = p.id
     LEFT JOIN memberships m ON m.space_id = p.space_id AND m.user_id = $1
     LEFT JOIN organization_memberships om
       ON om.organization_id = s.organization_id AND om.user_id = $1
     WHERE p.id = $2
       AND ($3::boolean OR t.page_id IS NULL)`,
    [userId, pageId, includeTrashed]
  );
  const row = rows[0];
  if (!row) return null;
  const role = row.direct_role ??
    (row.organization_role === "admin" || row.organization_role === "owner"
      ? "admin"
      : row.organization_role === "member"
        ? "viewer"
        : null);
  return { spaceId: row.space_id, role, path: row.path, status: row.status };
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
  request.spaceRole = role;
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

  fastify.decorate("requirePageRole", (minRole: Role, options?: { includeTrashed?: boolean }) => {
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
      const access = await getPageAccess(userId, pageId, options?.includeTrashed === true);
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
      if (access.status !== "published" && !hasMinRole(access.role, "editor")) {
        reply.status(403).send({ status: "error", message: "Draft pages require editor access" });
        return;
      }
      request.spaceRole = access.role;
      request.pageMeta = { spaceId: access.spaceId, path: access.path, status: access.status };
    };
  });
}

export default fp(rbacPlugin, { name: "rbac", dependencies: ["auth"] });
