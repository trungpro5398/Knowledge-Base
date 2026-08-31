import { pool } from "../../db/pool.js";

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  settings: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationMembershipRow {
  user_id: string;
  organization_id: string;
  role: "member" | "admin" | "owner";
  created_at: Date;
}

export interface AdminDashboardOrganizationRow {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
}

export interface AdminDashboardSpaceRow {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  organization_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AdminDashboardRow {
  organizations: AdminDashboardOrganizationRow[];
  spaces: AdminDashboardSpaceRow[];
}

export type OrganizationMutationStatus =
  | "success"
  | "slug_conflict"
  | "organization_not_found"
  | "forbidden";

export interface OrganizationMutationResult {
  status: OrganizationMutationStatus;
  organization: OrganizationRow | null;
  space?: AdminDashboardSpaceRow | null;
}

export interface OrganizationBootstrapMemberRow {
  user_id: string;
  organization_id: string;
  role: "member" | "admin" | "owner";
  created_at: Date;
  user_email: string;
  user_name: string | null;
}

export interface OrganizationBootstrapRow {
  organization: AdminDashboardOrganizationRow;
  role: "member" | "admin" | "owner";
  spaces: AdminDashboardSpaceRow[];
  members: OrganizationBootstrapMemberRow[];
}

export async function getOrganizationBootstrap(
  organizationId: string,
  userId: string,
  includeMembers: boolean
): Promise<OrganizationBootstrapRow | null> {
  const { rows } = await pool.query<OrganizationBootstrapRow>(
    `SELECT
       jsonb_build_object(
         'id', organization.id,
         'name', organization.name,
         'slug', organization.slug,
         'icon', organization.icon,
         'description', organization.description
       ) AS organization,
       actor.role,
       COALESCE((
         SELECT jsonb_agg(
           jsonb_build_object(
             'id', space.id,
             'name', space.name,
             'slug', space.slug,
             'icon', space.icon,
             'description', space.description,
             'organization_id', space.organization_id,
             'created_at', space.created_at,
             'updated_at', space.updated_at
           )
           ORDER BY space.name
         )
         FROM spaces space
         WHERE space.organization_id = organization.id
       ), '[]'::jsonb) AS spaces,
       CASE
         WHEN $3::boolean AND actor.role IN ('admin', 'owner') THEN COALESCE((
           SELECT jsonb_agg(
             jsonb_build_object(
               'user_id', membership.user_id,
               'organization_id', membership.organization_id,
               'role', membership.role,
               'created_at', membership.created_at,
               'user_email', auth_user.email,
               'user_name', auth_user.raw_user_meta_data->>'name'
             )
             ORDER BY membership.created_at, membership.user_id
           )
           FROM organization_memberships membership
           JOIN auth.users auth_user ON auth_user.id = membership.user_id
           WHERE membership.organization_id = organization.id
         ), '[]'::jsonb)
         ELSE '[]'::jsonb
       END AS members
     FROM organizations organization
     JOIN organization_memberships actor
       ON actor.organization_id = organization.id
      AND actor.user_id = $1
     WHERE organization.id = $2
       AND organization.deleted_at IS NULL`,
    [userId, organizationId, includeMembers]
  );
  return rows[0] ?? null;
}

export async function getAdminDashboard(userId: string): Promise<AdminDashboardRow> {
  const { rows } = await pool.query<AdminDashboardRow>(
    `SELECT
       COALESCE((
         SELECT jsonb_agg(
           jsonb_build_object(
             'id', organization.id,
             'name', organization.name,
             'slug', organization.slug,
             'icon', organization.icon,
             'description', organization.description
           )
           ORDER BY organization.name
         )
         FROM organizations organization
         JOIN organization_memberships membership
           ON membership.organization_id = organization.id
          AND membership.user_id = $1
         WHERE organization.deleted_at IS NULL
       ), '[]'::jsonb) AS organizations,
       COALESCE((
         SELECT jsonb_agg(
           jsonb_build_object(
             'id', space.id,
             'name', space.name,
             'slug', space.slug,
             'icon', space.icon,
             'description', space.description,
             'organization_id', space.organization_id,
             'created_at', space.created_at,
             'updated_at', space.updated_at
           )
           ORDER BY space.name
         )
         FROM spaces space
         WHERE EXISTS (
           SELECT 1 FROM memberships direct_membership
           WHERE direct_membership.space_id = space.id
             AND direct_membership.user_id = $1
         )
         OR (
           space.organization_id IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM organization_memberships organization_membership
             WHERE organization_membership.organization_id = space.organization_id
               AND organization_membership.user_id = $1
           )
         )
       ), '[]'::jsonb) AS spaces`,
    [userId]
  );
  return rows[0] ?? { organizations: [], spaces: [] };
}

export async function listOrganizationsForUser(userId: string): Promise<OrganizationRow[]> {
  if (!pool) return [];
  const { rows } = await pool.query<OrganizationRow>(
    `SELECT o.* FROM organizations o
     JOIN organization_memberships om ON om.organization_id = o.id
     WHERE om.user_id = $1 AND o.deleted_at IS NULL
     ORDER BY o.name`,
    [userId]
  );
  return rows;
}

export async function getOrganizationForUser(
  id: string,
  userId: string
): Promise<OrganizationRow | null> {
  const { rows } = await pool.query<OrganizationRow>(
    `SELECT organization.*
     FROM organizations organization
     JOIN organization_memberships membership
       ON membership.organization_id = organization.id
      AND membership.user_id = $2
     WHERE organization.id = $1
       AND organization.deleted_at IS NULL`,
    [id, userId]
  );
  return rows[0] ?? null;
}

export async function getOrganizationBySlug(slug: string): Promise<OrganizationRow | null> {
  if (!pool) return null;
  const { rows } = await pool.query<OrganizationRow>(
    "SELECT * FROM organizations WHERE slug = $1 AND deleted_at IS NULL",
    [slug]
  );
  return rows[0] ?? null;
}

export async function createOrganization(data: {
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  createdBy: string;
}): Promise<OrganizationMutationResult> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<{ result: OrganizationMutationResult }>(
    `SELECT tet_kb.create_organization($1, $2, $3, $4, $5, false) AS result`,
    [data.name, data.slug, data.icon ?? null, data.description ?? null, data.createdBy]
  );
  const result = rows[0]?.result;
  if (!result) throw new Error("Organization creation returned no result");
  return result;
}

export async function createOrganizationWithInitialSpace(data: {
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  createdBy: string;
}): Promise<OrganizationMutationResult> {
  const { rows } = await pool.query<{ result: OrganizationMutationResult }>(
    `SELECT tet_kb.create_organization($1, $2, $3, $4, $5, true) AS result`,
    [data.name, data.slug, data.icon ?? null, data.description ?? null, data.createdBy]
  );
  const result = rows[0]?.result;
  if (!result) throw new Error("Organization creation returned no result");
  return result;
}

export async function getUserRoleInOrganization(
  userId: string,
  organizationId: string
): Promise<string | null> {
  if (!pool) return null;
  const { rows } = await pool.query<{ role: string }>(
    `SELECT role FROM organization_memberships
     WHERE user_id = $1 AND organization_id = $2`,
    [userId, organizationId]
  );
  return rows[0]?.role ?? null;
}

export async function getSpacesByOrganizationForUser(
  organizationId: string,
  userId: string
): Promise<AdminDashboardSpaceRow[] | null> {
  const { rows } = await pool.query<{ spaces: AdminDashboardSpaceRow[] }>(
    `SELECT COALESCE((
       SELECT jsonb_agg(to_jsonb(space) ORDER BY space.name)
       FROM spaces space
       WHERE space.organization_id = organization.id
     ), '[]'::jsonb) AS spaces
     FROM organizations organization
     JOIN organization_memberships membership
       ON membership.organization_id = organization.id
      AND membership.user_id = $2
     WHERE organization.id = $1
       AND organization.deleted_at IS NULL`,
    [organizationId, userId]
  );
  return rows[0]?.spaces ?? null;
}

export async function deleteOrganization(
  id: string,
  actorUserId: string
): Promise<OrganizationMutationResult> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<{ result: OrganizationMutationResult }>(
    `SELECT tet_kb.delete_organization($1, $2) AS result`,
    [id, actorUserId]
  );
  const result = rows[0]?.result;
  if (!result) throw new Error("Organization deletion returned no result");
  return result;
}
