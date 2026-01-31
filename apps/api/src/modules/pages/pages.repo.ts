import { pool } from "../../db/pool.js";

export interface PageRow {
  id: string;
  space_id: string;
  parent_id: string | null;
  slug: string;
  path: string;
  title: string;
  status: string;
  current_version_id: string | null;
  created_by: string;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface PageVersionRow {
  id: string;
  page_id: string;
  content_md: string | null;
  content_json: Record<string, unknown> | null;
  summary: string | null;
  created_by: string;
  created_at: Date;
}

export async function getPagesTree(
  spaceId: string,
  options?: { publishedOnly?: boolean }
): Promise<PageRow[]> {
  if (!pool) return [];
  const publishedOnly = options?.publishedOnly === true;
  const { rows } = await pool.query<PageRow>(
    `SELECT * FROM pages
     WHERE space_id = $1
     AND id NOT IN (SELECT page_id FROM trash)
     ${publishedOnly ? "AND status = 'published'" : ""}
     ORDER BY path`,
    [spaceId]
  );
  return rows;
}

export async function getPageById(id: string, includeTrashed = false): Promise<(PageRow & { version?: PageVersionRow }) | null> {
  if (!pool) return null;
  let query = "SELECT * FROM pages WHERE id = $1";
  if (!includeTrashed) query += " AND id NOT IN (SELECT page_id FROM trash)";
  const { rows } = await pool.query<PageRow>(query, [id]);
  const page = rows[0];
  if (!page) return null;

  if (page.current_version_id) {
    const { rows: vRows } = await pool.query<PageVersionRow>(
      "SELECT * FROM page_versions WHERE id = $1",
      [page.current_version_id]
    );
    return { ...page, version: vRows[0] ?? undefined };
  }
  return { ...page, version: undefined };
}

export async function getPageByPath(spaceId: string, path: string): Promise<(PageRow & { version?: PageVersionRow }) | null> {
  if (!pool) return null;
  const { rows } = await pool.query<PageRow>(
    "SELECT * FROM pages WHERE space_id = $1 AND path = $2 AND status = 'published'",
    [spaceId, path]
  );
  const page = rows[0];
  if (!page) return null;

  if (page.current_version_id) {
    const { rows: vRows } = await pool.query<PageVersionRow>(
      "SELECT * FROM page_versions WHERE id = $1",
      [page.current_version_id]
    );
    return { ...page, version: vRows[0] ?? undefined };
  }
  return { ...page, version: undefined };
}

export async function createPage(data: {
  spaceId: string;
  parentId: string | null;
  title: string;
  slug: string;
  createdBy: string;
}): Promise<PageRow> {
  if (!pool) throw new Error("Database not configured");

  const path = data.parentId
    ? await getChildPath(data.parentId, data.slug)
    : data.slug;

  const { rows } = await pool.query<PageRow>(
    `INSERT INTO pages (space_id, parent_id, slug, path, title, status, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, 'draft', $6, $6)
     RETURNING *`,
    [data.spaceId, data.parentId, data.slug, path, data.title, data.createdBy]
  );
  return rows[0]!;
}

async function getChildPath(parentId: string, slug: string): Promise<string> {
  if (!pool) return slug;
  const { rows } = await pool.query<{ path: string }>("SELECT path FROM pages WHERE id = $1", [parentId]);
  const parentPath = rows[0]?.path ?? "";
  return parentPath ? `${parentPath}.${slug}` : slug;
}

export async function updatePage(
  id: string,
  data: { title?: string; slug?: string; parent_id?: string | null; status?: string }
): Promise<PageRow | null> {
  if (!pool) return null;

  const updates: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (data.title !== undefined) {
    updates.push(`title = $${i++}`);
    values.push(data.title);
  }
  if (data.slug !== undefined) {
    updates.push(`slug = $${i++}`);
    values.push(data.slug);
  }
  if (data.parent_id !== undefined) {
    updates.push(`parent_id = $${i++}`);
    values.push(data.parent_id);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${i++}`);
    values.push(data.status);
  }

  if (updates.length === 0) return getPageById(id) as Promise<PageRow | null>;

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await pool.query<PageRow>(
    `UPDATE pages SET ${updates.join(", ")} WHERE id = $${i} RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function createVersion(data: {
  pageId: string;
  contentMd?: string | null;
  contentJson?: Record<string, unknown> | null;
  summary?: string | null;
  createdBy: string;
}): Promise<PageVersionRow> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<PageVersionRow>(
    `INSERT INTO page_versions (page_id, content_md, content_json, summary, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.pageId, data.contentMd ?? null, data.contentJson ? JSON.stringify(data.contentJson) : null, data.summary ?? null, data.createdBy]
  );
  return rows[0]!;
}

export async function setCurrentVersion(pageId: string, versionId: string): Promise<void> {
  if (!pool) return;
  await pool.query(
    "UPDATE pages SET current_version_id = $1, updated_at = NOW() WHERE id = $2",
    [versionId, pageId]
  );
}

export async function listVersions(pageId: string): Promise<PageVersionRow[]> {
  if (!pool) return [];
  const { rows } = await pool.query<PageVersionRow>(
    "SELECT * FROM page_versions WHERE page_id = $1 ORDER BY created_at DESC",
    [pageId]
  );
  return rows;
}

export async function softDeletePage(pageId: string, userId: string): Promise<void> {
  if (!pool) return;
  await pool.query("INSERT INTO trash (page_id, deleted_by) VALUES ($1, $2) ON CONFLICT (page_id) DO UPDATE SET deleted_at = NOW(), deleted_by = $2", [pageId, userId]);
}

export async function restoreFromTrash(pageId: string): Promise<void> {
  if (!pool) return;
  await pool.query("DELETE FROM trash WHERE page_id = $1", [pageId]);
}
