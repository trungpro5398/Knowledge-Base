import { pool } from "../../db/pool.js";

export interface LabelRow {
  id: string;
  space_id: string;
  name: string;
  color: string | null;
  created_at: Date;
}

export async function listBySpace(spaceId: string): Promise<LabelRow[]> {
  if (!pool) return [];
  const { rows } = await pool.query<LabelRow>(
    "SELECT * FROM page_labels WHERE space_id = $1 ORDER BY name",
    [spaceId]
  );
  return rows;
}

export async function create(spaceId: string, name: string, color?: string): Promise<LabelRow> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<LabelRow>(
    "INSERT INTO page_labels (space_id, name, color) VALUES ($1, $2, $3) RETURNING *",
    [spaceId, name, color ?? null]
  );
  return rows[0]!;
}
