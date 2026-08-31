import { pool } from "../../db/pool.js";

export interface MembershipRow {
  user_id: string;
  space_id: string;
  role: "viewer" | "editor" | "admin";
  created_at: string;
}

export interface MembershipWithUser extends MembershipRow {
  user_email: string;
  user_name?: string | null;
}

interface SpaceMembersBootstrapRow {
  members: MembershipWithUser[];
}

export type MembershipMutationStatus =
  | "success"
  | "space_not_found"
  | "forbidden"
  | "member_not_found"
  | "last_admin"
  | "invalid_action"
  | "invalid_role";

export interface MembershipMutationResult {
  status: MembershipMutationStatus;
  membership: MembershipRow | null;
}

interface MembershipMutationRpcRow {
  result: MembershipMutationResult;
}

export interface SearchUsersOptions {
  query?: string;
  limit?: number;
  organizationId?: string;
  spaceId?: string;
  pageId?: string;
}

export type SearchUsersStatus =
  | "success"
  | "forbidden"
  | "organization_forbidden"
  | "space_forbidden"
  | "page_forbidden"
  | "page_not_found";

export interface SearchUsersResult {
  status: SearchUsersStatus;
  users: Array<{ id: string; email: string; name?: string | null }>;
}

export async function getMembershipsForAdmin(
  spaceId: string,
  userId: string
): Promise<MembershipWithUser[] | null> {
  if (!pool) return null;
  const { rows } = await pool.query<SpaceMembersBootstrapRow>(
    `SELECT COALESCE((
       SELECT jsonb_agg(
         jsonb_build_object(
           'user_id', membership.user_id,
           'space_id', membership.space_id,
           'role', membership.role,
           'created_at', membership.created_at,
           'user_email', auth_user.email,
           'user_name', auth_user.raw_user_meta_data->>'name'
         )
         ORDER BY membership.created_at, membership.user_id
       )
       FROM memberships membership
       JOIN auth.users auth_user ON auth_user.id = membership.user_id
       WHERE membership.space_id = target.space_id
     ), '[]'::jsonb) AS members
     FROM (
       SELECT
         space.id AS space_id,
         COALESCE(
           direct_membership.role,
           CASE
             WHEN organization_membership.role IN ('admin', 'owner') THEN 'admin'
             WHEN organization_membership.role = 'member' THEN 'viewer'
           END
         ) AS effective_role
       FROM spaces space
       LEFT JOIN memberships direct_membership
         ON direct_membership.space_id = space.id
        AND direct_membership.user_id = $2
       LEFT JOIN organization_memberships organization_membership
         ON organization_membership.organization_id = space.organization_id
        AND organization_membership.user_id = $2
       WHERE space.id = $1
     ) target
     WHERE target.effective_role = 'admin'`,
    [spaceId, userId]
  );
  return rows[0]?.members ?? null;
}

export async function upsertMembershipForAdmin(
  spaceId: string,
  targetUserId: string,
  role: "viewer" | "editor" | "admin",
  adminUserId: string
): Promise<MembershipMutationResult> {
  return mutateMembership("upsert", spaceId, targetUserId, role, adminUserId);
}

export async function upsertMembershipByEmailForAdmin(
  spaceId: string,
  targetEmail: string,
  role: "viewer" | "editor" | "admin",
  adminUserId: string
): Promise<MembershipMutationResult> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<MembershipMutationRpcRow>(
    `SELECT tet_kb.add_space_member_by_email($1, $2, $3, $4) AS result`,
    [spaceId, targetEmail, role, adminUserId]
  );
  if (!rows[0]?.result) throw new Error("Space email membership mutation returned no result");
  return rows[0].result;
}

export async function updateMembershipRoleForAdmin(
  spaceId: string,
  targetUserId: string,
  role: "viewer" | "editor" | "admin",
  adminUserId: string
): Promise<MembershipMutationResult> {
  return mutateMembership("update", spaceId, targetUserId, role, adminUserId);
}

export async function removeMembershipForAdmin(
  spaceId: string,
  targetUserId: string,
  adminUserId: string
): Promise<MembershipMutationStatus> {
  const result = await mutateMembership("remove", spaceId, targetUserId, null, adminUserId);
  return result.status;
}

async function mutateMembership(
  action: "upsert" | "update" | "remove",
  spaceId: string,
  targetUserId: string,
  role: "viewer" | "editor" | "admin" | null,
  adminUserId: string
): Promise<MembershipMutationResult> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<MembershipMutationRpcRow>(
    `SELECT tet_kb.mutate_space_membership($1, $2, $3, $4, $5) AS result`,
    [action, spaceId, targetUserId, role, adminUserId]
  );
  if (!rows[0]?.result) throw new Error("Membership mutation returned no result");
  return rows[0].result;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function searchUsersForAdmin({
  query = "",
  limit = 20,
  organizationId,
  spaceId,
  pageId,
}: SearchUsersOptions, actorUserId: string): Promise<SearchUsersResult> {
  if (!pool) throw new Error("Database not configured");
  const normalizedQuery = query.trim();
  const searchTerm = `%${escapeLike(normalizedQuery)}%`;

  const { rows } = await pool.query<{ result: SearchUsersResult }>(
    `SELECT tet_kb.search_users_for_admin($1, $2, $3, $4, $5, $6) AS result`,
    [
      searchTerm,
      limit,
      organizationId ?? null,
      spaceId ?? null,
      pageId ?? null,
      actorUserId,
    ]
  );
  const result = rows[0]?.result;
  if (!result) throw new Error("Admin user search returned no result");
  return result;
}
