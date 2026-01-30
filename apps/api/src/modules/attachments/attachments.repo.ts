import { pool } from "../../db/pool.js";

export interface AttachmentRow {
  id: string;
  page_id: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: Date;
}

export async function create(data: {
  pageId: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
}): Promise<AttachmentRow> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<AttachmentRow>(
    `INSERT INTO attachments (page_id, file_path, mime_type, size_bytes, uploaded_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.pageId, data.filePath, data.mimeType, data.sizeBytes, data.uploadedBy]
  );
  return rows[0]!;
}

export async function getById(id: string): Promise<AttachmentRow | null> {
  if (!pool) return null;
  const { rows } = await pool.query<AttachmentRow>("SELECT * FROM attachments WHERE id = $1", [id]);
  return rows[0] ?? null;
}
