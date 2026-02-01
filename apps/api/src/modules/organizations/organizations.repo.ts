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

export async function getOrganizationById(id: string): Promise<OrganizationRow | null> {
  if (!pool) return null;
  const { rows } = await pool.query<OrganizationRow>(
    "SELECT * FROM organizations WHERE id = $1 AND deleted_at IS NULL",
    [id]
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
}): Promise<OrganizationRow> {
  if (!pool) throw new Error("Database not configured");
  
  const { rows } = await pool.query<OrganizationRow>(
    `INSERT INTO organizations (name, slug, icon, description)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.name, data.slug, data.icon ?? null, data.description ?? null]
  );
  
  const org = rows[0]!;
  
  // Add creator as owner
  await pool.query(
    `INSERT INTO organization_memberships (user_id, organization_id, role)
     VALUES ($1, $2, 'owner')`,
    [data.createdBy, org.id]
  );
  
  return org;
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

export async function getSpacesByOrganization(organizationId: string) {
  if (!pool) return [];
  const { rows } = await pool.query(
    `SELECT * FROM spaces 
     WHERE organization_id = $1 
     ORDER BY name`,
    [organizationId]
  );
  return rows;
}
