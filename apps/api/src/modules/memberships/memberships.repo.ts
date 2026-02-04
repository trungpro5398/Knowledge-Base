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

export async function searchUsers(query: string, limit = 10): Promise<Array<{ id: string; email: string; name?: string }>> {
  if (!pool) return [];
  const searchTerm = `%${query.toLowerCase().trim()}%`;
  const { rows } = await pool.query<{ id: string; email: string; name?: string }>(
    `SELECT id, email, raw_user_meta_data->>'name' as name
     FROM auth.users
     WHERE email ILIKE $1 OR raw_user_meta_data->>'name' ILIKE $1
     ORDER BY email ASC
     LIMIT $2`,
    [searchTerm, limit]
  );
  return rows;
}
