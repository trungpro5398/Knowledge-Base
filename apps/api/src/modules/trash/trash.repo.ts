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
     JOIN spaces s ON s.id = p.space_id
     LEFT JOIN memberships m ON m.space_id = p.space_id AND m.user_id = $1
     LEFT JOIN organization_memberships om
       ON om.organization_id = s.organization_id AND om.user_id = $1
     WHERE COALESCE(m.role::text,
       CASE WHEN om.role IN ('admin', 'owner') THEN 'admin'
            WHEN om.role = 'member' THEN 'viewer'
            ELSE NULL END) IN ('editor', 'admin')
     ORDER BY t.deleted_at DESC`,
    [userId]
  );
  return rows;
}
