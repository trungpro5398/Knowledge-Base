import { pool } from "../../db/pool.js";

export interface TrashRow {
  page_id: string;
  deleted_at: Date;
  deleted_by: string;
  title: string;
  path: string;
  space_id: string;
}

export async function listTrash(userId: string): Promise<TrashRow[]> {
  if (!pool) return [];
  const { rows } = await pool.query<TrashRow>(
    `SELECT t.page_id, t.deleted_at, t.deleted_by,
            p.title, p.path::text as path, p.space_id
     FROM trash t
     JOIN pages p ON p.id = t.page_id
     JOIN memberships m ON m.space_id = p.space_id AND m.user_id = $1 AND m.role IN ('editor','admin')
     ORDER BY t.deleted_at DESC`,
    [userId]
  );
  return rows;
}

export async function isInTrash(pageId: string): Promise<boolean> {
  if (!pool) return false;
  const { rows } = await pool.query("SELECT 1 FROM trash WHERE page_id = $1", [pageId]);
  return rows.length > 0;
}
