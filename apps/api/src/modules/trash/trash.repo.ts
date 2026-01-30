import { pool } from "../../db/pool.js";

export interface TrashRow {
  page_id: string;
  deleted_at: Date;
  deleted_by: string;
}

export async function listTrash(userId: string): Promise<TrashRow[]> {
  if (!pool) return [];
  const { rows } = await pool.query<TrashRow>(
    `SELECT t.* FROM trash t
     JOIN pages p ON p.id = t.page_id
     JOIN memberships m ON m.space_id = p.space_id AND m.user_id = $1 AND m.role IN ('editor','admin')
     ORDER BY t.deleted_at DESC`,
    [userId]
  );
  return rows;
}
