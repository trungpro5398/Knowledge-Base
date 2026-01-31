import { pool } from "../../db/pool.js";

export interface TemplateRow {
  id: string;
  space_id: string;
  name: string;
  content_md: string | null;
  created_at: Date;
}

export async function getTemplatesBySpaceId(spaceId: string): Promise<TemplateRow[]> {
  if (!pool) return [];
  const { rows } = await pool.query<TemplateRow>(
    "SELECT id, space_id, name, content_md, created_at FROM page_templates WHERE space_id = $1 ORDER BY name",
    [spaceId]
  );
  return rows;
}

export async function getTemplateById(id: string): Promise<TemplateRow | null> {
  if (!pool) return null;
  const { rows } = await pool.query<TemplateRow>(
    "SELECT id, space_id, name, content_md, created_at FROM page_templates WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}
