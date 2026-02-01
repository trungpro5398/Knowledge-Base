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

export async function getSpaceById(id: string): Promise<SpaceRow | null> {
  if (!pool) return null;
  const { rows } = await pool.query<SpaceRow>("SELECT * FROM spaces WHERE id = $1", [id]);
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

export async function getSpacesStats(userId: string): Promise<SpaceStats[]> {
  if (!pool) return [];
  const { rows } = await pool.query<SpaceStats>(
    `SELECT 
       s.id as space_id,
       COUNT(p.id)::int as total_pages,
       COUNT(CASE WHEN p.status = 'published' THEN 1 END)::int as published_pages,
       COUNT(CASE WHEN p.status = 'draft' THEN 1 END)::int as draft_pages
     FROM spaces s
     JOIN memberships m ON m.space_id = s.id
     LEFT JOIN pages p ON s.id = p.space_id AND p.deleted_at IS NULL
     WHERE m.user_id = $1
     GROUP BY s.id`,
    [userId]
  );
  return rows;
}
