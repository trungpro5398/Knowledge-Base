import { pool } from "../../db/pool.js";

export interface MembershipRow {
  user_id: string;
  space_id: string;
  role: "viewer" | "editor" | "admin";
  created_at: string;
}

export interface MembershipWithUser extends MembershipRow {
  user_email: string;
  user_name?: string;
}

export interface SearchUsersOptions {
  query?: string;
  limit?: number;
  organizationId?: string;
  spaceId?: string;
  pageId?: string;
}

export async function getMembershipsBySpace(spaceId: string): Promise<MembershipWithUser[]> {
  if (!pool) return [];
  const { rows } = await pool.query<MembershipWithUser>(
    `SELECT 
      m.user_id,
      m.space_id,
      m.role,
      m.created_at,
      u.email as user_email,
      u.raw_user_meta_data->>'name' as user_name
    FROM memberships m
    JOIN auth.users u ON u.id = m.user_id
    WHERE m.space_id = $1
    ORDER BY m.created_at ASC`,
    [spaceId]
  );
  return rows;
}

export async function addMembership(
  spaceId: string,
  userId: string,
  role: "viewer" | "editor" | "admin"
): Promise<MembershipRow> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<MembershipRow>(
    `INSERT INTO memberships (user_id, space_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, space_id) 
     DO UPDATE SET role = EXCLUDED.role
     RETURNING *`,
    [userId, spaceId, role]
  );
  return rows[0]!;
}

export async function updateMembershipRole(
  spaceId: string,
  userId: string,
  role: "viewer" | "editor" | "admin"
): Promise<MembershipRow> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<MembershipRow>(
    `UPDATE memberships 
     SET role = $3
     WHERE space_id = $1 AND user_id = $2
     RETURNING *`,
    [spaceId, userId, role]
  );
  if (rows.length === 0) {
    throw new Error("Membership not found");
  }
  return rows[0]!;
}

export async function removeMembership(spaceId: string, userId: string): Promise<void> {
  if (!pool) throw new Error("Database not configured");
  await pool.query(
    `DELETE FROM memberships 
     WHERE space_id = $1 AND user_id = $2`,
    [spaceId, userId]
  );
}

export async function getUserByEmail(email: string): Promise<{ id: string; email: string; name?: string } | null> {
  if (!pool) return null;
  const { rows } = await pool.query<{ id: string; email: string; name?: string }>(
    `SELECT id, email, raw_user_meta_data->>'name' as name
     FROM auth.users
     WHERE email = $1
     LIMIT 1`,
    [email.toLowerCase().trim()]
  );
  return rows[0] ?? null;
}

export async function searchUsers({
  query = "",
  limit = 20,
  organizationId,
  spaceId,
  pageId,
}: SearchUsersOptions): Promise<Array<{ id: string; email: string; name?: string }>> {
  if (!pool) return [];
  const normalizedQuery = query.trim();
  const searchTerm = `%${normalizedQuery}%`;

  const { rows } = await pool.query<{ id: string; email: string; name?: string }>(
    `SELECT
       u.id,
       u.email,
       u.raw_user_meta_data->>'name' as name
     FROM auth.users u
     WHERE
       ($1::text = '' OR u.email ILIKE $2 OR COALESCE(u.raw_user_meta_data->>'name', '') ILIKE $2)
       AND (
         $3::uuid IS NULL OR NOT EXISTS (
           SELECT 1
           FROM organization_memberships om
           WHERE om.organization_id = $3 AND om.user_id = u.id
         )
       )
       AND (
         $3::uuid IS NULL OR NOT EXISTS (
           SELECT 1
           FROM memberships m
           JOIN spaces s ON s.id = m.space_id
           WHERE s.organization_id = $3 AND m.user_id = u.id
         )
       )
       AND (
         $3::uuid IS NULL OR NOT EXISTS (
           SELECT 1
           FROM watchers w
           JOIN pages p ON p.id = w.page_id
           JOIN spaces s ON s.id = p.space_id
           WHERE s.organization_id = $3 AND w.user_id = u.id
         )
       )
       AND (
         $4::uuid IS NULL OR NOT EXISTS (
           SELECT 1
           FROM memberships m
           WHERE m.space_id = $4 AND m.user_id = u.id
         )
       )
       AND (
         $4::uuid IS NULL OR NOT EXISTS (
           SELECT 1
           FROM watchers w
           JOIN pages p ON p.id = w.page_id
           WHERE p.space_id = $4 AND w.user_id = u.id
         )
       )
       AND (
         $5::uuid IS NULL OR NOT EXISTS (
           SELECT 1
           FROM watchers w
           WHERE w.page_id = $5 AND w.user_id = u.id
         )
       )
       AND (
         $5::uuid IS NULL OR NOT EXISTS (
           SELECT 1
           FROM pages p
           JOIN memberships m ON m.space_id = p.space_id
           WHERE p.id = $5 AND m.user_id = u.id
         )
       )
     ORDER BY lower(u.email) ASC
     LIMIT $6`,
    [normalizedQuery, searchTerm, organizationId ?? null, spaceId ?? null, pageId ?? null, limit]
  );
  return rows;
}
