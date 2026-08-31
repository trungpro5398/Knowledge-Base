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

export async function getAccessibleFilePath(
  attachmentId: string,
  userId: string
): Promise<string | null> {
  if (!pool) return null;
  const { rows } = await pool.query<{ file_path: string }>(
    `SELECT a.file_path
     FROM attachments a
     JOIN pages p ON p.id = a.page_id
     JOIN spaces s ON s.id = p.space_id
     LEFT JOIN page_versions pv ON pv.id = p.published_version_id
     LEFT JOIN trash t ON t.page_id = p.id
     LEFT JOIN memberships m ON m.space_id = p.space_id AND m.user_id = $1
     LEFT JOIN organization_memberships om
       ON om.organization_id = s.organization_id AND om.user_id = $1
     WHERE a.id = $2
       AND t.page_id IS NULL
       AND (
         COALESCE(
           m.role::text,
           CASE
             WHEN om.role IN ('admin', 'owner') THEN 'admin'
             WHEN om.role = 'member' THEN 'viewer'
           END
         ) IN ('editor', 'admin')
         OR (
           p.status = 'published'
           AND pv.id IS NOT NULL
           AND (m.user_id IS NOT NULL OR om.user_id IS NOT NULL)
           AND position(a.file_path in COALESCE(pv.content_md, '')) > 0
         )
       )
     LIMIT 1`,
    [userId, attachmentId]
  );
  return rows[0]?.file_path ?? null;
}

export async function finalizePendingUpload(data: {
  pageId: string;
  userId: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<AttachmentRow | null> {
  if (!pool) return null;
  const { rows } = await pool.query<AttachmentRow>(
    `WITH consumed AS (
       DELETE FROM pending_attachment_uploads
       WHERE object_path = $1
         AND page_id = $2::uuid
         AND user_id = $3::uuid
         AND mime_type = $4
         AND size_bytes = $5
         AND expires_at > NOW()
       RETURNING object_path
     )
     INSERT INTO attachments (page_id, file_path, mime_type, size_bytes, uploaded_by)
     SELECT $2::uuid, consumed.object_path, $4, $5, $3::uuid
     FROM consumed
     RETURNING *`,
    [data.filePath, data.pageId, data.userId, data.mimeType, data.sizeBytes]
  );
  return rows[0] ?? null;
}

export async function cancelPendingUpload(data: {
  pageId: string;
  userId: string;
  filePath: string;
}): Promise<void> {
  if (!pool) return;
  await pool.query(
    `DELETE FROM pending_attachment_uploads
     WHERE object_path = $1
       AND page_id = $2::uuid
       AND user_id = $3::uuid`,
    [data.filePath, data.pageId, data.userId]
  );
}

export async function listAttachmentCleanupPaths(limit = 50): Promise<string[]> {
  if (!pool) return [];
  const { rows } = await pool.query<{ object_path: string }>(
    `SELECT candidate.object_path
     FROM (
       SELECT pending.object_path, pending.expires_at AS ready_at
       FROM pending_attachment_uploads pending
       WHERE pending.expires_at <= NOW()
         AND NOT EXISTS (
           SELECT 1 FROM attachments attachment
           WHERE attachment.file_path = pending.object_path
         )
       UNION ALL
       SELECT queued.object_path, queued.queued_at AS ready_at
       FROM pending_attachment_deletions queued
     ) candidate
     GROUP BY candidate.object_path
     ORDER BY MIN(candidate.ready_at), candidate.object_path
     LIMIT $1::integer`,
    [limit]
  );
  return rows.map((row) => row.object_path);
}

export async function acknowledgeAttachmentCleanup(filePaths: string[]): Promise<void> {
  if (!pool || filePaths.length === 0) return;
  await pool.query(
    `WITH deleted_pending AS (
       DELETE FROM pending_attachment_uploads pending
       WHERE pending.object_path = ANY($1::text[])
         AND pending.expires_at <= NOW()
         AND NOT EXISTS (
           SELECT 1 FROM attachments attachment
           WHERE attachment.file_path = pending.object_path
         )
       RETURNING pending.object_path
     )
     DELETE FROM pending_attachment_deletions queued
     WHERE queued.object_path = ANY($1::text[])`,
    [filePaths]
  );
}

export async function getPublishedFilePath(path: string): Promise<string | null> {
  if (!pool) return null;
  const { rows } = await pool.query<{ file_path: string }>(
    `SELECT a.file_path
     FROM attachments a
     JOIN pages p ON p.id = a.page_id
     JOIN page_versions pv ON pv.id = p.published_version_id
     LEFT JOIN trash t ON t.page_id = p.id
     WHERE a.file_path = $1
       AND p.status = 'published'
       AND position(a.file_path in COALESCE(pv.content_md, '')) > 0
       AND t.page_id IS NULL
     LIMIT 1`,
    [path]
  );
  return rows[0]?.file_path ?? null;
}
