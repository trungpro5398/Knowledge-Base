import { pool } from "../../db/pool.js";

export interface SpaceRow {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  organization_id: string | null;
  created_at: Date;
  updated_at: Date;
  organization_name?: string | null;
}

export interface SpaceBootstrapPageRow {
  id: string;
  parent_id: string | null;
  slug: string;
  path: string;
  title: string;
  status: string;
  sort_order: number;
}

export interface SpaceBootstrapOrganizationRow {
  id: string;
  name: string;
  icon: string | null;
}

export interface SpaceBootstrapRow {
  space: SpaceRow;
  role: "viewer" | "editor" | "admin";
  pages: SpaceBootstrapPageRow[];
  spaces: SpaceRow[];
  organizations: SpaceBootstrapOrganizationRow[];
}

export async function getSpaceBootstrap(
  spaceId: string,
  userId: string
): Promise<SpaceBootstrapRow | null> {
  const { rows } = await pool.query<SpaceBootstrapRow>(
    `SELECT
       to_jsonb(target) - 'direct_role' - 'organization_role' - 'effective_role' AS space,
       target.effective_role AS role,
       COALESCE((
         SELECT jsonb_agg(
           jsonb_build_object(
             'id', page.id,
             'parent_id', page.parent_id,
             'slug', page.slug,
             'path', page.path::text,
             'title', CASE
               WHEN target.effective_role = 'viewer' THEN page.published_title
               ELSE page.title
             END,
             'status', page.status,
             'sort_order', page.sort_order
           )
           ORDER BY page.sort_order, page.path::text
         )
         FROM pages page
         LEFT JOIN trash deleted ON deleted.page_id = page.id
         WHERE page.space_id = target.id
           AND deleted.page_id IS NULL
           AND (
             target.effective_role <> 'viewer'
             OR (page.status = 'published' AND page.published_version_id IS NOT NULL)
           )
       ), '[]'::jsonb) AS pages,
       COALESCE((
         SELECT jsonb_agg(to_jsonb(available_space) ORDER BY available_space.name)
         FROM spaces available_space
         WHERE EXISTS (
           SELECT 1 FROM memberships available_membership
           WHERE available_membership.space_id = available_space.id
             AND available_membership.user_id = $1
         )
         OR (
           available_space.organization_id IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM organization_memberships available_org_membership
             WHERE available_org_membership.organization_id = available_space.organization_id
               AND available_org_membership.user_id = $1
           )
         )
       ), '[]'::jsonb) AS spaces,
       COALESCE((
         SELECT jsonb_agg(
           jsonb_build_object('id', organization.id, 'name', organization.name, 'icon', organization.icon)
           ORDER BY organization.name
         )
         FROM organizations organization
         JOIN organization_memberships organization_membership
           ON organization_membership.organization_id = organization.id
          AND organization_membership.user_id = $1
         WHERE organization.deleted_at IS NULL
       ), '[]'::jsonb) AS organizations
     FROM (
       SELECT
         s.*,
         m.role AS direct_role,
         om.role AS organization_role,
         COALESCE(
           m.role,
           CASE
             WHEN om.role IN ('admin', 'owner') THEN 'admin'
             WHEN om.role = 'member' THEN 'viewer'
           END
         ) AS effective_role
       FROM spaces s
       LEFT JOIN memberships m ON m.space_id = s.id AND m.user_id = $1
       LEFT JOIN organization_memberships om
         ON om.organization_id = s.organization_id AND om.user_id = $1
       WHERE s.id = $2
         AND (m.user_id IS NOT NULL OR om.user_id IS NOT NULL)
     ) target`,
    [userId, spaceId]
  );
  return rows[0] ?? null;
}

export async function listSpacesForUser(userId: string): Promise<SpaceRow[]> {
  if (!pool) return [];
  const { rows } = await pool.query<SpaceRow>(
    `SELECT DISTINCT s.* FROM spaces s
     WHERE 
       -- Direct space membership
       EXISTS (
         SELECT 1 FROM memberships m 
         WHERE m.space_id = s.id AND m.user_id = $1
       )
       OR
       -- Organization membership (if space belongs to org)
       (s.organization_id IS NOT NULL AND EXISTS (
         SELECT 1 FROM organization_memberships om
         WHERE om.organization_id = s.organization_id AND om.user_id = $1
       ))
     ORDER BY s.name`,
    [userId]
  );
  return rows;
}

export async function listPublicSpaces(): Promise<SpaceRow[]> {
  if (!pool) return [];
  const { rows } = await pool.query<SpaceRow>(
    `SELECT
       s.id, s.name, s.slug, s.icon, s.description, s.organization_id,
       s.created_at, s.updated_at,
       o.name AS organization_name
     FROM spaces s
     LEFT JOIN organizations o ON o.id = s.organization_id AND o.deleted_at IS NULL
     WHERE EXISTS (
       SELECT 1
       FROM pages p
       LEFT JOIN trash t ON t.page_id = p.id
       WHERE p.space_id = s.id
         AND p.status = 'published'
         AND t.page_id IS NULL
     )
     ORDER BY s.name`
  );
  return rows;
}

export async function getMemberRole(
  spaceId: string,
  userId: string
): Promise<"viewer" | "editor" | "admin" | null> {
  if (!pool) return null;
  const { rows } = await pool.query<{ direct_role: string | null; organization_role: string | null }>(
    `SELECT m.role AS direct_role, om.role AS organization_role
     FROM spaces s
     LEFT JOIN memberships m ON m.space_id = s.id AND m.user_id = $2
     LEFT JOIN organization_memberships om
       ON om.organization_id = s.organization_id AND om.user_id = $2
     WHERE s.id = $1`,
    [spaceId, userId]
  );
  const role = rows[0]?.direct_role ??
    (rows[0]?.organization_role === "admin" || rows[0]?.organization_role === "owner"
      ? "admin"
      : rows[0]?.organization_role === "member"
        ? "viewer"
        : null);
  if (role === "viewer" || role === "editor" || role === "admin") return role;
  return null;
}

export async function hasMembership(userId: string, spaceId: string): Promise<boolean> {
  if (!pool) return false;
  const { rows } = await pool.query(
    "SELECT 1 FROM memberships WHERE user_id = $1 AND space_id = $2",
    [userId, spaceId]
  );
  return rows.length > 0;
}

export async function getSpaceById(id: string): Promise<SpaceRow | null> {
  if (!pool) return null;
  const { rows } = await pool.query<SpaceRow>("SELECT * FROM spaces WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function getSpaceForUser(spaceId: string, userId: string): Promise<SpaceRow | null> {
  if (!pool) return null;
  const { rows } = await pool.query<SpaceRow>(
    `SELECT s.* FROM spaces s
     WHERE s.id = $1
       AND (
         EXISTS (
           SELECT 1 FROM memberships m
           WHERE m.space_id = s.id AND m.user_id = $2
         )
         OR EXISTS (
           SELECT 1 FROM organization_memberships om
           WHERE om.organization_id = s.organization_id AND om.user_id = $2
         )
       )`,
    [spaceId, userId]
  );
  return rows[0] ?? null;
}

export async function getSpaceBySlug(slug: string): Promise<SpaceRow | null> {
  if (!pool) return null;
  const { rows } = await pool.query<SpaceRow>(
    `SELECT s.*, o.name AS organization_name
     FROM spaces s
     LEFT JOIN organizations o ON o.id = s.organization_id AND o.deleted_at IS NULL
     WHERE s.slug = $1`,
    [slug]
  );
  return rows[0] ?? null;
}

export type SpaceMutationStatus =
  | "success"
  | "space_not_found"
  | "forbidden"
  | "slug_conflict"
  | "invalid_action";

export interface SpaceMutationResult {
  status: SpaceMutationStatus;
  space: SpaceRow | null;
  previous_slug?: string | null;
}

export async function mutateSpace(data: {
  action: "create" | "update" | "delete";
  spaceId?: string | null;
  name?: string | null;
  slug?: string | null;
  icon?: string | null;
  description?: string | null;
  organizationId?: string | null;
  actorUserId: string;
}): Promise<SpaceMutationResult> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<{ result: SpaceMutationResult }>(
    `SELECT tet_kb.mutate_space($1, $2, $3, $4, $5, $6, $7, $8) AS result`,
    [
      data.action,
      data.spaceId ?? null,
      data.name ?? null,
      data.slug ?? null,
      data.icon ?? null,
      data.description ?? null,
      data.organizationId ?? null,
      data.actorUserId,
    ]
  );
  const result = rows[0]?.result;
  if (!result) throw new Error("Space mutation returned no result");
  return result;
}

export interface SpaceStats {
  space_id: string;
  total_pages: number;
  published_pages: number;
  draft_pages: number;
}

export async function getSpacesStats(userId: string): Promise<SpaceStats[]> {
  if (!pool) return [];
  const { rows } = await pool.query<SpaceStats>(
    `SELECT
       s.id as space_id,
       COUNT(p.id) FILTER (WHERE t.page_id IS NULL)::int as total_pages,
       COUNT(p.id) FILTER (WHERE t.page_id IS NULL AND p.status = 'published')::int as published_pages,
       COUNT(p.id) FILTER (WHERE t.page_id IS NULL AND p.status = 'draft')::int as draft_pages
     FROM spaces s
     LEFT JOIN memberships m ON m.space_id = s.id AND m.user_id = $1
     LEFT JOIN organization_memberships om
       ON om.organization_id = s.organization_id AND om.user_id = $1
     LEFT JOIN pages p ON s.id = p.space_id
     LEFT JOIN trash t ON t.page_id = p.id
     WHERE m.user_id IS NOT NULL OR om.user_id IS NOT NULL
     GROUP BY s.id`,
    [userId]
  );
  return rows;
}
