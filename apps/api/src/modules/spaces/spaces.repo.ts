import { pool } from "../../db/pool.js";

export interface SpaceRow {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function listSpacesForUser(userId: string): Promise<SpaceRow[]> {
  if (!pool) return [];
  const { rows } = await pool.query<SpaceRow>(
    `SELECT s.* FROM spaces s
     JOIN memberships m ON m.space_id = s.id
     WHERE m.user_id = $1
     ORDER BY s.name`,
    [userId]
  );
  return rows;
}

export async function listPublicSpaces(): Promise<SpaceRow[]> {
  if (!pool) return [];
  const { rows } = await pool.query<SpaceRow>(
    `SELECT s.* FROM spaces s
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
  const { rows } = await pool.query<{ role: string }>(
    "SELECT role FROM memberships WHERE space_id = $1 AND user_id = $2",
    [spaceId, userId]
  );
  const role = rows[0]?.role;
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
     JOIN memberships m ON m.space_id = s.id
     WHERE s.id = $1 AND m.user_id = $2`,
    [spaceId, userId]
  );
  return rows[0] ?? null;
}

export async function getSpaceBySlug(slug: string): Promise<SpaceRow | null> {
  if (!pool) return null;
  const { rows } = await pool.query<SpaceRow>("SELECT * FROM spaces WHERE slug = $1", [slug]);
  return rows[0] ?? null;
}

export async function createSpace(data: {
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  createdBy: string;
}): Promise<SpaceRow> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<SpaceRow>(
    `INSERT INTO spaces (name, slug, icon, description)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.name, data.slug, data.icon ?? null, data.description ?? null]
  );
  return rows[0]!;
}

export interface SpaceStats {
  space_id: string;
  total_pages: number;
  published_pages: number;
  draft_pages: number;
}

export async function deleteSpace(id: string): Promise<void> {
  if (!pool) throw new Error("Database not configured");
  await pool.query("DELETE FROM spaces WHERE id = $1", [id]);
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
     JOIN memberships m ON m.space_id = s.id
     LEFT JOIN pages p ON s.id = p.space_id
     LEFT JOIN trash t ON t.page_id = p.id
     WHERE m.user_id = $1
     GROUP BY s.id`,
    [userId]
  );
  return rows;
}
