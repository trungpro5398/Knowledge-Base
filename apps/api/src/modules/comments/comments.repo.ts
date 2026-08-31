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

export interface ListedCommentRow extends CommentRow {
  created_at_text: string;
}

export type CommentAccessStatus =
  | "success"
  | "page_not_found"
  | "not_member"
  | "requires_editor"
  | "published_version_not_found"
  | "invalid_version"
  | "viewer_version_forbidden"
  | "invalid_parent"
  | "viewer_parent_forbidden"
  | "invalid_content"
  | "invalid_cursor";

export interface ListCommentsResult {
  status: CommentAccessStatus;
  comments: ListedCommentRow[];
  has_more: boolean;
}

export interface CreateCommentResult {
  status: CommentAccessStatus;
  comment: CommentRow | null;
}

export async function listByPageForMember(
  pageId: string,
  actorUserId: string,
  options: {
    cursor?: { createdAt: string; id: string };
    limit: number;
  }
): Promise<ListCommentsResult> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<{ result: ListCommentsResult }>(
    `SELECT tet_kb.list_comments_for_member($1, $2, $3, $4, $5) AS result`,
    [
      pageId,
      actorUserId,
      options.limit,
      options.cursor?.createdAt ?? null,
      options.cursor?.id ?? null,
    ]
  );
  const result = rows[0]?.result;
  if (!result) throw new Error("Comment list returned no result");
  return result;
}

export async function createForMember(data: {
  pageId: string;
  versionId?: string | null;
  parentId?: string | null;
  content: string;
  authorId: string;
}): Promise<CreateCommentResult> {
  if (!pool) throw new Error("Database not configured");
  const { rows } = await pool.query<{ result: CreateCommentResult }>(
    `SELECT tet_kb.create_comment_for_member($1, $2, $3, $4, $5) AS result`,
    [
      data.pageId,
      data.authorId,
      data.versionId ?? null,
      data.parentId ?? null,
      data.content,
    ]
  );
  const result = rows[0]?.result;
  if (!result) throw new Error("Comment creation returned no result");
  return result;
}
