import { pool } from "../../db/pool.js";

export async function addWatcher(pageId: string, userId: string): Promise<void> {
  if (!pool) return;
  await pool.query(
    "INSERT INTO watchers (user_id, page_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [userId, pageId]
  );
}

export async function removeWatcher(pageId: string, userId: string): Promise<void> {
  if (!pool) return;
  await pool.query("DELETE FROM watchers WHERE user_id = $1 AND page_id = $2", [userId, pageId]);
}

export async function isWatching(pageId: string, userId: string): Promise<boolean> {
  if (!pool) return false;
  const { rows } = await pool.query(
    "SELECT 1 FROM watchers WHERE user_id = $1 AND page_id = $2",
    [userId, pageId]
  );
  return rows.length > 0;
}
