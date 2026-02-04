import { pool } from "../../db/pool.js";

export interface SearchResult {
  id: string;
  page_id: string;
  title: string;
  path: string;
  content_snippet: string;
  space_id: string;
}

export async function search(params: {
  userId: string;
  q?: string;
  spaceId?: string;
  labelIds?: string[];
  status?: string;
  limit: number;
  offset: number;
}): Promise<{ results: SearchResult[]; total: number }> {
  if (!pool) return { results: [], total: 0 };

  const conditions: string[] = ["t.page_id IS NULL"];
  const values: unknown[] = [params.userId];
  let i = 2;

  if (params.spaceId) {
    conditions.push(`p.space_id = $${i++}`);
    values.push(params.spaceId);
  }
  if (params.status) {
    conditions.push(`p.status = $${i++}`);
    values.push(params.status);
  }
  if (params.labelIds?.length) {
    conditions.push(`p.id IN (
      SELECT page_id FROM page_label_mappings WHERE label_id = ANY($${i++}::uuid[])
    )`);
    values.push(params.labelIds);
  }

  if (params.q?.trim()) {
    const q = params.q.trim();
    conditions.push(`(p.title ILIKE $${i} OR (pv.search_vector IS NOT NULL AND pv.search_vector @@ plainto_tsquery('english', $${i + 1})))`);
    values.push(`%${q}%`, q);
    i += 2;
  }

  const whereClause = conditions.join(" AND ");
  values.push(params.limit, params.offset);

  const { rows } = await pool.query<SearchResult & { total: string }>(
    `SELECT p.id, p.id as page_id, p.title, p.path::text, 
            left(COALESCE(pv.content_md, ''), 200) as content_snippet, p.space_id,
            count(*) OVER()::text as total
     FROM pages p
     JOIN memberships m ON m.space_id = p.space_id AND m.user_id = $1
     LEFT JOIN trash t ON t.page_id = p.id
     LEFT JOIN page_versions pv ON pv.id = p.current_version_id
     WHERE ${whereClause}
     ORDER BY p.updated_at DESC
     LIMIT $${i++} OFFSET $${i}`,
    values
  );

  const total = parseInt(rows[0]?.total ?? "0", 10);
  const results = rows.map(({ total: _, ...r }) => r);
  return { results, total };
}
