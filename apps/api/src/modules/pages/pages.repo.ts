import { pool } from "../../db/pool.js";
import { ValidationError } from "../../utils/errors.js";

export interface PageRow {
  id: string;
  space_id: string;
  parent_id: string | null;
  slug: string;
  path: string;
  title: string;
  status: string;
  sort_order: number;
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
  rendered_html: string | null;
  toc_json: Record<string, unknown>[] | null;
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
    `SELECT p.* FROM pages p
     LEFT JOIN trash t ON t.page_id = p.id
     WHERE p.space_id = $1
     AND t.page_id IS NULL
     ${publishedOnly ? "AND p.status = 'published'" : ""}`,
    [spaceId]
  );
  return rows;
}

type PageWithVersionRow = PageRow & {
  version_id: string | null;
  version_page_id: string | null;
  content_md: string | null;
  content_json: Record<string, unknown> | null;
  summary: string | null;
  rendered_html: string | null;
  toc_json: Record<string, unknown>[] | null;
  version_created_by: string | null;
  version_created_at: Date | null;
};

function mapPageWithVersion(row: PageWithVersionRow): PageRow & { version?: PageVersionRow } {
  const version = row.version_id
    ? {
        id: row.version_id,
        page_id: row.version_page_id!,
        content_md: row.content_md,
        content_json: row.content_json,
        summary: row.summary,
        rendered_html: row.rendered_html,
        toc_json: row.toc_json,
        created_by: row.version_created_by!,
        created_at: row.version_created_at!,
      }
    : undefined;

  const {
    version_id: _versionId,
    version_page_id: _versionPageId,
    content_md: _contentMd,
    content_json: _contentJson,
    summary: _summary,
    rendered_html: _renderedHtml,
    toc_json: _tocJson,
    version_created_by: _versionCreatedBy,
    version_created_at: _versionCreatedAt,
    ...page
  } = row;

  return { ...page, version };
}

export async function getPageById(id: string, includeTrashed = false): Promise<(PageRow & { version?: PageVersionRow }) | null> {
  if (!pool) return null;
  const { rows } = await pool.query<PageWithVersionRow>(
    `SELECT 
       p.*,
       pv.id as version_id,
       pv.page_id as version_page_id,
       pv.content_md,
       pv.content_json,
       pv.summary,
       pv.rendered_html,
       pv.toc_json,
       pv.created_by as version_created_by,
       pv.created_at as version_created_at
     FROM pages p
     LEFT JOIN page_versions pv ON pv.id = p.current_version_id
     LEFT JOIN trash t ON t.page_id = p.id
     WHERE p.id = $1
     ${includeTrashed ? "" : "AND t.page_id IS NULL"}`,
    [id]
  );
  const row = rows[0];
  if (!row) return null;
  return mapPageWithVersion(row);
}

export async function getPageByPath(spaceId: string, path: string): Promise<(PageRow & { version?: PageVersionRow }) | null> {
  if (!pool) return null;
  const { rows } = await pool.query<PageWithVersionRow>(
    `SELECT 
       p.*,
       pv.id as version_id,
       pv.page_id as version_page_id,
       pv.content_md,
       pv.content_json,
       pv.summary,
       pv.rendered_html,
       pv.toc_json,
       pv.created_by as version_created_by,
       pv.created_at as version_created_at
     FROM pages p
     LEFT JOIN page_versions pv ON pv.id = p.current_version_id
     LEFT JOIN trash t ON t.page_id = p.id
     WHERE p.space_id = $1 AND p.path = $2 AND p.status = 'published'
     AND t.page_id IS NULL`,
    [spaceId, path]
  );
  const row = rows[0];
  if (!row) return null;
  return mapPageWithVersion(row);
}

export async function createPage(data: {
  spaceId: string;
  parentId: string | null;
  title: string;
  slug: string;
  createdBy: string;
}): Promise<PageRow> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<PageRow>(
    `WITH parent AS (
       SELECT path::text AS path_text FROM pages WHERE id = $2
     ),
     max_sort AS (
       SELECT COALESCE(MAX(sort_order), -1) + 1 AS sort_order
       FROM pages
       WHERE space_id = $1 AND (parent_id IS NOT DISTINCT FROM $2)
     )
     INSERT INTO pages (space_id, parent_id, slug, path, title, status, sort_order, created_by, updated_by)
     SELECT
       $1,
       $2,
       $3,
       CASE
         WHEN $2 IS NULL THEN $3
         WHEN (SELECT path_text FROM parent) IS NULL OR (SELECT path_text FROM parent) = '' THEN $3
         ELSE (SELECT path_text FROM parent) || '.' || $3
       END::ltree,
       $4,
       'draft',
       (SELECT sort_order FROM max_sort),
       $5,
       $5
     RETURNING *`,
    [data.spaceId, data.parentId, data.slug, data.title, data.createdBy]
  );
  return rows[0]!;
}

export async function updatePage(
  id: string,
  data: { title?: string; slug?: string; parent_id?: string | null; status?: string; sort_order?: number }
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
  if (data.sort_order !== undefined) {
    updates.push(`sort_order = $${i++}`);
    values.push(data.sort_order);
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

export async function reorderPages(
  spaceId: string,
  updates: Array<{ id: string; sort_order: number; parent_id?: string | null }>
): Promise<void> {
  if (!pool || updates.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updatesWithParent = updates.filter((update) =>
      Object.prototype.hasOwnProperty.call(update, "parent_id")
    );
    const allIds = new Set<string>();
    for (const update of updates) allIds.add(update.id);
    for (const update of updatesWithParent) {
      if (update.parent_id) allIds.add(update.parent_id);
    }

    const ids = Array.from(allIds);
    const pageRows = ids.length
      ? await client.query<{ id: string; parent_id: string | null; path: string; slug: string }>(
          `SELECT id, parent_id, path, slug FROM pages WHERE id = ANY($1::uuid[])`,
          [ids]
        )
      : { rows: [] };

    const pagesById = new Map<string, { id: string; parent_id: string | null; path: string; slug: string }>();
    for (const row of pageRows.rows) {
      pagesById.set(row.id, row);
    }

    for (const update of updates) {
      if (!pagesById.has(update.id)) {
        throw new ValidationError("Page not found");
      }
    }

    const changedParents = updatesWithParent
      .map((update) => {
        const current = pagesById.get(update.id);
        return current
          ? {
              update,
              current,
              currentParent: current.parent_id ?? null,
              nextParent: update.parent_id ?? null,
            }
          : null;
      })
      .filter((item): item is NonNullable<typeof item> => !!item)
      .filter((item) => item.currentParent !== item.nextParent);

    const isDescendantPath = (path: string, ancestor: string) =>
      path === ancestor || path.startsWith(`${ancestor}.`);

    const pathDepth = (path: string) => path.split(".").filter(Boolean).length;

    const rootsToMove = changedParents.filter((item) =>
      !changedParents.some(
        (other) => other.update.id !== item.update.id && isDescendantPath(item.current.path, other.current.path)
      )
    );

    rootsToMove.sort((a, b) => pathDepth(a.current.path) - pathDepth(b.current.path));

    const newPathById = new Map<string, string>();

    for (const { update, current } of rootsToMove) {
      const nextParentId = update.parent_id ?? null;
      if (nextParentId === current.id) {
        throw new ValidationError("Không thể đặt trang làm cha của chính nó");
      }

      let parentPath: string | null = null;
      if (nextParentId) {
        parentPath = newPathById.get(nextParentId) ?? pagesById.get(nextParentId)?.path ?? null;
        if (!parentPath) {
          throw new ValidationError("Parent page not found");
        }
        if (isDescendantPath(parentPath, current.path)) {
          throw new ValidationError("Không thể kéo trang vào chính nó hoặc trang con");
        }
      }

      const newPath = parentPath ? `${parentPath}.${current.slug}` : current.slug;

      await client.query(
        `UPDATE pages
         SET path = CASE
           WHEN id = $1 THEN $2::ltree
           ELSE $2::ltree || subpath(path, nlevel($3::ltree))
         END,
         updated_at = NOW()
         WHERE space_id = $4 AND path <@ $3::ltree`,
        [current.id, newPath, current.path, spaceId]
      );

      newPathById.set(current.id, newPath);
    }

    if (updates.length > 0) {
      const values: unknown[] = [];
      const rowsSql = updates
        .map((update, index) => {
          const parentIdProvided = Object.prototype.hasOwnProperty.call(update, "parent_id");
          const base = index * 4;
          values.push(
            update.id,
            update.sort_order,
            parentIdProvided ? update.parent_id ?? null : null,
            parentIdProvided
          );
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
        })
        .join(", ");

      values.push(spaceId);
      const spaceParam = values.length;

      await client.query(
        `UPDATE pages AS p
         SET sort_order = u.sort_order::int,
             parent_id = CASE WHEN u.parent_id_set THEN u.parent_id::uuid ELSE p.parent_id END,
             updated_at = NOW()
         FROM (VALUES ${rowsSql}) AS u(id, sort_order, parent_id, parent_id_set)
         WHERE p.id = u.id::uuid AND p.space_id = $${spaceParam}`,
        values
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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

export async function getVersionById(versionId: string): Promise<PageVersionRow | null> {
  if (!pool) return null;
  const { rows } = await pool.query<PageVersionRow>(
    "SELECT * FROM page_versions WHERE id = $1",
    [versionId]
  );
  return rows[0] ?? null;
}

export async function updateVersionRendered(
  versionId: string,
  renderedHtml: string,
  tocJson: { id: string; text: string; level: number }[]
): Promise<void> {
  if (!pool) return;
  await pool.query(
    "UPDATE page_versions SET rendered_html = $1, toc_json = $2 WHERE id = $3",
    [renderedHtml, JSON.stringify(tocJson), versionId]
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
