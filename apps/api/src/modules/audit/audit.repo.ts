import { pool } from "../../db/pool.js";

export interface AuditEventRow {
  id: string;
  space_id: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export async function listAuditEvents(params: {
  spaceId: string;
  actorId?: string;
  resourceType?: string;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
}): Promise<{ events: AuditEventRow[]; total: number }> {
  if (!pool) return { events: [], total: 0 };

  const conditions: string[] = ["space_id = $1"];
  const values: unknown[] = [params.spaceId];
  let i = 2;

  if (params.actorId) {
    conditions.push(`actor_id = $${i++}`);
    values.push(params.actorId);
  }
  if (params.resourceType) {
    conditions.push(`resource_type = $${i++}`);
    values.push(params.resourceType);
  }
  if (params.from) {
    conditions.push(`created_at >= $${i++}`);
    values.push(params.from);
  }
  if (params.to) {
    conditions.push(`created_at <= $${i++}`);
    values.push(params.to);
  }

  values.push(params.limit, params.offset);
  const whereClause = conditions.join(" AND ");

  const { rows } = await pool.query<AuditEventRow & { total: string }>(
    `SELECT *, count(*) OVER()::text as total
     FROM audit_events
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${i++} OFFSET $${i}`,
    values
  );

  const total = parseInt(rows[0]?.total ?? "0", 10);
  const events = rows.map(({ total: _, ...e }) => e);
  return { events, total };
}

export async function createAuditEvent(data: {
  spaceId: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO audit_events (space_id, actor_id, action, resource_type, resource_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      data.spaceId,
      data.actorId,
      data.action,
      data.resourceType,
      data.resourceId ?? null,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ]
  );
}
