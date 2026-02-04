import { pool } from "../../db/pool.js";
import type { OrganizationMembershipRow } from "./organizations.repo.js";

export interface OrganizationMembershipWithUser extends OrganizationMembershipRow {
  user_email: string;
  user_name?: string;
}

export async function getOrganizationMemberships(organizationId: string): Promise<OrganizationMembershipWithUser[]> {
  if (!pool) return [];
  const { rows } = await pool.query<OrganizationMembershipWithUser>(
    `SELECT 
      om.user_id,
      om.organization_id,
      om.role,
      om.created_at,
      u.email as user_email,
      u.raw_user_meta_data->>'name' as user_name
    FROM organization_memberships om
    JOIN auth.users u ON u.id = om.user_id
    WHERE om.organization_id = $1
    ORDER BY om.created_at ASC`,
    [organizationId]
  );
  return rows;
}

export async function addOrganizationMembership(
  organizationId: string,
  userId: string,
  role: "member" | "admin" | "owner"
): Promise<OrganizationMembershipRow> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<OrganizationMembershipRow>(
    `INSERT INTO organization_memberships (user_id, organization_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, organization_id) 
     DO UPDATE SET role = EXCLUDED.role
     RETURNING *`,
    [userId, organizationId, role]
  );
  return rows[0]!;
}

export async function updateOrganizationMembershipRole(
  organizationId: string,
  userId: string,
  role: "member" | "admin" | "owner"
): Promise<OrganizationMembershipRow> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<OrganizationMembershipRow>(
    `UPDATE organization_memberships 
     SET role = $3
     WHERE organization_id = $1 AND user_id = $2
     RETURNING *`,
    [organizationId, userId, role]
  );
  if (rows.length === 0) {
    throw new Error("Organization membership not found");
  }
  return rows[0]!;
}

export async function removeOrganizationMembership(organizationId: string, userId: string): Promise<void> {
  if (!pool) throw new Error("Database not configured");
  await pool.query(
    `DELETE FROM organization_memberships 
     WHERE organization_id = $1 AND user_id = $2`,
    [organizationId, userId]
  );
}
