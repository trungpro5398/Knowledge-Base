import { pool } from "../../db/pool.js";
import type { OrganizationMembershipRow } from "./organizations.repo.js";

export interface OrganizationMembershipWithUser extends OrganizationMembershipRow {
  user_email: string;
  user_name?: string | null;
}

export type OrganizationMembershipMutationStatus =
  | "success"
  | "organization_not_found"
  | "forbidden"
  | "member_not_found"
  | "owner_required"
  | "last_owner"
  | "invalid_action"
  | "invalid_role";

export interface OrganizationMembershipMutationResult {
  status: OrganizationMembershipMutationStatus;
  membership: OrganizationMembershipRow | null;
}

interface OrganizationMembersBootstrapRow {
  members: OrganizationMembershipWithUser[];
}

interface OrganizationMembershipMutationRpcRow {
  result: OrganizationMembershipMutationResult;
}

export async function getOrganizationMembershipsForAdmin(
  organizationId: string,
  userId: string
): Promise<OrganizationMembershipWithUser[] | null> {
  if (!pool) return null;
  const { rows } = await pool.query<OrganizationMembersBootstrapRow>(
    `SELECT COALESCE((
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
       WHERE membership.organization_id = actor.organization_id
     ), '[]'::jsonb) AS members
     FROM organization_memberships actor
     JOIN organizations organization
       ON organization.id = actor.organization_id
      AND organization.deleted_at IS NULL
     WHERE actor.organization_id = $1
       AND actor.user_id = $2
       AND actor.role IN ('admin', 'owner')`,
    [organizationId, userId]
  );
  return rows[0]?.members ?? null;
}

export async function upsertOrganizationMembershipForAdmin(
  organizationId: string,
  target: { userId?: string; email?: string },
  role: "member" | "admin" | "owner",
  adminUserId: string
): Promise<OrganizationMembershipMutationResult> {
  return mutateOrganizationMembership(
    "upsert",
    organizationId,
    target.userId ?? null,
    target.email ?? null,
    role,
    adminUserId
  );
}

export async function updateOrganizationMembershipRoleForAdmin(
  organizationId: string,
  targetUserId: string,
  role: "member" | "admin" | "owner",
  adminUserId: string
): Promise<OrganizationMembershipMutationResult> {
  return mutateOrganizationMembership(
    "update",
    organizationId,
    targetUserId,
    null,
    role,
    adminUserId
  );
}

export async function removeOrganizationMembershipForAdmin(
  organizationId: string,
  targetUserId: string,
  adminUserId: string
): Promise<OrganizationMembershipMutationStatus> {
  const result = await mutateOrganizationMembership(
    "remove",
    organizationId,
    targetUserId,
    null,
    null,
    adminUserId
  );
  return result.status;
}

async function mutateOrganizationMembership(
  action: "upsert" | "update" | "remove",
  organizationId: string,
  targetUserId: string | null,
  targetEmail: string | null,
  role: "member" | "admin" | "owner" | null,
  adminUserId: string
): Promise<OrganizationMembershipMutationResult> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<OrganizationMembershipMutationRpcRow>(
    `SELECT tet_kb.mutate_organization_membership($1, $2, $3, $4, $5, $6) AS result`,
    [action, organizationId, targetUserId, targetEmail, role, adminUserId]
  );
  if (!rows[0]?.result) throw new Error("Organization membership mutation returned no result");
  return rows[0].result;
}
