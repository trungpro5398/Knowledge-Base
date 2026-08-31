import { pool } from "../../db/pool.js";

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
  published_version_id: string | null;
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

export type PublicTreePageRow = Pick<
  PageRow,
  "id" | "parent_id" | "slug" | "path" | "title" | "status" | "sort_order" | "updated_at"
>;

export type PageVersionSummaryRow = Pick<
  PageVersionRow,
  "id" | "page_id" | "summary" | "created_by" | "created_at"
>;

export type CreatePageStatus =
  | "success"
  | "not_member"
  | "requires_editor"
  | "invalid_parent"
  | "path_conflict";

export interface CreatePageResult {
  status: CreatePageStatus;
  page: (PageRow & { version?: PageVersionRow }) | null;
}

export type UpdatePageStatus =
  | "success"
  | "page_not_found"
  | "not_member"
  | "requires_editor"
  | "invalid_title"
  | "invalid_slug"
  | "invalid_sort_order"
  | "invalid_parent"
  | "cyclic_parent"
  | "path_conflict";

export interface UpdatePageResult {
  status: UpdatePageStatus;
  page: PageRow | null;
  affects_published?: boolean;
  path_changed?: boolean;
}

export type ReorderPagesStatus =
  | "success"
  | "not_member"
  | "requires_editor"
  | "invalid_updates"
  | "page_not_found"
  | "invalid_parent"
  | "cyclic_parent"
  | "path_conflict";

export interface ReorderPagesResult {
  status: ReorderPagesStatus;
  affected_count?: number;
  path_changed_count?: number;
  affects_published?: boolean;
}

export type SavePageVersionStatus =
  | "success"
  | "page_not_found"
  | "not_member"
  | "requires_editor"
  | "invalid_content"
  | "invalid_summary";

export interface SavePageVersionResult {
  status: SavePageVersionStatus;
  version: PageVersionSummaryRow | null;
  reused_autosave?: boolean;
}

export type PublishPageStatus =
  | "success"
  | "page_not_found"
  | "source_not_found"
  | "source_changed"
  | "not_member"
  | "requires_editor"
  | "invalid_rendered_output";

export interface PublishSourceResult {
  status: PublishPageStatus;
  source: { content_md: string | null; content_hash: string } | null;
}

export interface PublishPageResult {
  status: PublishPageStatus;
  page: PageRow | null;
}

export type PageTrashAction = "trash" | "restore" | "purge";

export type PageTrashMutationStatus =
  | "success"
  | "page_not_found"
  | "not_member"
  | "requires_editor"
  | "not_in_trash"
  | "invalid_action";

export interface PageTrashMutationResult {
  status: PageTrashMutationStatus;
  page: Pick<PageRow, "space_id" | "status" | "path"> | null;
  affects_published?: boolean;
  affected_count?: number;
  queued_object_count?: number;
}

function pageColumns(version: "current" | "published" = "current"): string {
  const title = version === "published" ? "p.published_title AS title" : "p.title";
  const currentVersion = version === "published"
    ? "p.published_version_id AS current_version_id"
    : "p.current_version_id";
  const updatedAt = version === "published" ? "p.published_updated_at AS updated_at" : "p.updated_at";
  return `
    p.id, p.space_id, p.parent_id, p.slug, p.path::text AS path,
    ${title}, p.status, p.sort_order, ${currentVersion},
    p.published_version_id, p.created_by, p.updated_by, p.created_at, ${updatedAt}`;
}

export async function getPagesTree(
  spaceId: string,
  options?: { publishedOnly?: boolean }
): Promise<PageRow[]> {
  if (!pool) return [];
  const publishedOnly = options?.publishedOnly === true;
  const { rows } = await pool.query<PageRow>(
    `SELECT ${publishedOnly ? pageColumns("published") : "p.*"} FROM pages p
     LEFT JOIN trash t ON t.page_id = p.id
     WHERE p.space_id = $1
     AND t.page_id IS NULL
     ${publishedOnly ? "AND p.status = 'published' AND p.published_version_id IS NOT NULL" : ""}`,
    [spaceId]
  );
  return rows;
}

export async function getPublishedPagesTree(spaceId: string): Promise<PublicTreePageRow[]> {
  if (!pool) return [];
  const { rows } = await pool.query<PublicTreePageRow>(
    `SELECT
       p.id, p.parent_id, p.slug, p.path::text AS path,
       p.published_title AS title, p.status, p.sort_order,
       p.published_updated_at AS updated_at
     FROM pages p
     LEFT JOIN trash t ON t.page_id = p.id
     WHERE p.space_id = $1
       AND p.status = 'published'
       AND p.published_version_id IS NOT NULL
       AND t.page_id IS NULL`,
    [spaceId]
  );
  return rows;
}

export async function getPublishedTreeEtag(spaceId: string): Promise<string> {
  if (!pool) return "0:0";
  const { rows } = await pool.query<{ count: string; max_updated: Date | null }>(
    `SELECT COUNT(*)::text as count, MAX(p.published_updated_at) as max_updated
     FROM pages p
     LEFT JOIN trash t ON t.page_id = p.id
     WHERE p.space_id = $1
       AND p.status = 'published'
       AND t.page_id IS NULL`,
    [spaceId]
  );
  const row = rows[0];
  const count = row?.count ? Number(row.count) : 0;
  const maxUpdated = row?.max_updated ? new Date(row.max_updated).getTime() : 0;
  return `${count}:${maxUpdated}`;
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

export async function getPageById(
  id: string,
  includeTrashed = false,
  version: "current" | "published" = "current"
): Promise<(PageRow & { version?: PageVersionRow }) | null> {
  if (!pool) return null;
  const versionColumn = version === "published" ? "published_version_id" : "current_version_id";
  const publishedOnly = version === "published"
    ? "AND p.status = 'published' AND p.published_version_id IS NOT NULL"
    : "";
  const { rows } = await pool.query<PageWithVersionRow>(
    `SELECT
       ${pageColumns(version)},
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
     LEFT JOIN page_versions pv ON pv.id = p.${versionColumn}
     LEFT JOIN trash t ON t.page_id = p.id
     WHERE p.id = $1
     ${publishedOnly}
     ${includeTrashed ? "" : "AND t.page_id IS NULL"}`,
    [id]
  );
  const row = rows[0];
  if (!row) return null;
  return mapPageWithVersion(row);
}

export async function getPageMetadataById(
  id: string,
  includeTrashed = false
): Promise<PageRow | null> {
  if (!pool) return null;
  const { rows } = await pool.query<PageRow>(
    `SELECT ${pageColumns()}
     FROM pages p
     LEFT JOIN trash t ON t.page_id = p.id
     WHERE p.id = $1
     ${includeTrashed ? "" : "AND t.page_id IS NULL"}`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getPageByPath(spaceId: string, path: string): Promise<(PageRow & { version?: PageVersionRow }) | null> {
  if (!pool) return null;
  const { rows } = await pool.query<PageWithVersionRow>(
    `SELECT
       ${pageColumns("published")},
       pv.id as version_id,
       pv.page_id as version_page_id,
       CASE WHEN pv.rendered_html IS NULL THEN pv.content_md ELSE NULL END AS content_md,
       pv.content_json,
       pv.summary,
       pv.rendered_html,
       pv.toc_json,
       pv.created_by as version_created_by,
       pv.created_at as version_created_at
     FROM pages p
     LEFT JOIN page_versions pv ON pv.id = p.published_version_id
     LEFT JOIN trash t ON t.page_id = p.id
     WHERE p.space_id = $1 AND p.path = $2 AND p.status = 'published'
     AND p.published_version_id IS NOT NULL
     AND t.page_id IS NULL`,
    [spaceId, path]
  );
  const row = rows[0];
  if (!row) return null;
  return mapPageWithVersion(row);
}

export async function createPageForEditor(data: {
  spaceId: string;
  parentId: string | null;
  title: string;
  slug: string;
  templateId: string | null;
  actorUserId: string;
}): Promise<CreatePageResult> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<{ result: CreatePageResult }>(
    `SELECT tet_kb.create_page_for_editor($1, $2, $3, $4, $5, $6) AS result`,
    [
      data.spaceId,
      data.parentId,
      data.title,
      data.slug,
      data.templateId,
      data.actorUserId,
    ]
  );
  const result = rows[0]?.result;
  if (!result) throw new Error("Page creation returned no result");
  return result;
}

export async function updatePageForEditor(
  id: string,
  actorUserId: string,
  data: { title?: string; slug?: string; parent_id?: string | null; sort_order?: number }
): Promise<UpdatePageResult> {
  if (!pool) throw new Error("Database not configured");
  const titleSet = Object.prototype.hasOwnProperty.call(data, "title");
  const slugSet = Object.prototype.hasOwnProperty.call(data, "slug");
  const parentSet = Object.prototype.hasOwnProperty.call(data, "parent_id");
  const sortSet = Object.prototype.hasOwnProperty.call(data, "sort_order");
  const { rows } = await pool.query<{ result: UpdatePageResult }>(
    `SELECT tet_kb.update_page_for_editor(
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
    ) AS result`,
    [
      id,
      actorUserId,
      data.title ?? null,
      titleSet,
      data.slug ?? null,
      slugSet,
      data.parent_id ?? null,
      parentSet,
      data.sort_order ?? null,
      sortSet,
    ]
  );
  const result = rows[0]?.result;
  if (!result) throw new Error("Page update returned no result");
  return result;
}

export async function reorderPagesForEditor(
  spaceId: string,
  actorUserId: string,
  updates: Array<{ id: string; sort_order: number; parent_id?: string | null }>
): Promise<ReorderPagesResult> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<{ result: ReorderPagesResult }>(
    `SELECT tet_kb.reorder_pages_for_editor($1, $2, $3::jsonb) AS result`,
    [spaceId, actorUserId, JSON.stringify(updates)]
  );
  const result = rows[0]?.result;
  if (!result) throw new Error("Page reorder returned no result");
  return result;
}

export async function savePageVersionForEditor(data: {
  pageId: string;
  contentMd?: string | null;
  contentJson?: Record<string, unknown> | null;
  summary?: string | null;
  draftUpdate: boolean;
  actorUserId: string;
}): Promise<SavePageVersionResult> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<{ result: SavePageVersionResult }>(
    `SELECT tet_kb.save_page_version_for_editor(
      $1, $2, $3, $4::jsonb, $5, $6
    ) AS result`,
    [
      data.pageId,
      data.actorUserId,
      data.contentMd ?? null,
      data.contentJson ? JSON.stringify(data.contentJson) : null,
      data.summary ?? null,
      data.draftUpdate,
    ]
  );
  const result = rows[0]?.result;
  if (!result) throw new Error("Page version save returned no result");
  return result;
}

export async function getVersionById(versionId: string): Promise<PageVersionRow | null> {
  if (!pool) return null;
  const { rows } = await pool.query<PageVersionRow>(
    "SELECT * FROM page_versions WHERE id = $1",
    [versionId]
  );
  return rows[0] ?? null;
}

export async function getPublishSourceForEditor(
  pageId: string,
  versionId: string,
  actorUserId: string
): Promise<PublishSourceResult> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<{ result: PublishSourceResult }>(
    `SELECT tet_kb.get_publish_source_for_editor($1, $2, $3) AS result`,
    [pageId, versionId, actorUserId]
  );
  const result = rows[0]?.result;
  if (!result) throw new Error("Publish source returned no result");
  return result;
}

export async function publishPageVersionForEditor(data: {
  pageId: string;
  sourceVersionId: string;
  sourceContentHash: string;
  renderedHtml: string;
  tocJson: { id: string; text: string; level: number }[];
  actorUserId: string;
}): Promise<PublishPageResult> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<{ result: PublishPageResult }>(
    `SELECT tet_kb.publish_page_version_for_editor(
      $1, $2, $3, $4, $5::jsonb, $6
    ) AS result`,
    [
      data.pageId,
      data.sourceVersionId,
      data.sourceContentHash,
      data.renderedHtml,
      JSON.stringify(data.tocJson),
      data.actorUserId,
    ]
  );
  const result = rows[0]?.result;
  if (!result) throw new Error("Page publish returned no result");
  return result;
}

const VERSION_HISTORY_LIMIT = 100;

export async function listVersions(pageId: string): Promise<PageVersionSummaryRow[]> {
  if (!pool) return [];
  const { rows } = await pool.query<PageVersionSummaryRow>(
    `SELECT id, page_id, summary, created_by, created_at
     FROM page_versions
     WHERE page_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [pageId, VERSION_HISTORY_LIMIT]
  );
  return rows;
}

export async function mutatePageTrash(
  action: PageTrashAction,
  pageId: string,
  actorUserId: string
): Promise<PageTrashMutationResult> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<{ result: PageTrashMutationResult }>(
    `SELECT tet_kb.mutate_page_trash($1, $2, $3) AS result`,
    [action, pageId, actorUserId]
  );
  const result = rows[0]?.result;
  if (!result) throw new Error("Page trash mutation returned no result");
  return result;
}
