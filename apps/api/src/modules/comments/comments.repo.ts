import { pool } from "../../db/pool.js";

export interface CommentRow {
  id: string;
  page_id: string;
  version_id: string | null;
  parent_id: string | null;
  content: string;
  author_id: string;
  created_at: Date;
  updated_at: Date;
}

export async function listByPage(pageId: string): Promise<CommentRow[]> {
  if (!pool) return [];
  const { rows } = await pool.query<CommentRow>(
    "SELECT * FROM comments WHERE page_id = $1 ORDER BY created_at ASC",
    [pageId]
  );
  return rows;
}

export async function create(data: {
  pageId: string;
  versionId?: string | null;
  parentId?: string | null;
  content: string;
  authorId: string;
}): Promise<CommentRow> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<CommentRow>(
    `INSERT INTO comments (page_id, version_id, parent_id, content, author_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.pageId, data.versionId ?? null, data.parentId ?? null, data.content, data.authorId]
  );
  return rows[0]!;
}
