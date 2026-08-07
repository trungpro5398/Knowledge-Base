import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config/env.js";

type QueryResult<T = any> = {
  rows: T[];
  rowCount: number;
};
type PendingQuery = { sql: string; params: unknown[] };

function isReadQuery(sql: string): boolean {
  const normalized = sql.trim();
  if (/^SELECT\b/i.test(normalized)) return true;
  if (/^WITH\b/i.test(normalized)) {
    return !/\b(INSERT|UPDATE|DELETE)\b/i.test(normalized);
  }
  return false;
}

let _client: SupabaseClient<any, any, "tet_kb"> | null = null;

function getClient(): SupabaseClient<any, any, "tet_kb"> {
  if (!_client) {
    if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required.");
    }
    _client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: "tet_kb" },
    });
  }
  return _client;
}

async function execute<T = any>(
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  const { data, error } = await getClient().schema("tet_kb").rpc("api_exec", {
    p_sql: sql,
    p_params: params,
  });
  if (error) throw new Error(`Supabase API query failed: ${error.message}`);
  const result = (data ?? {}) as { rows?: T[]; rowCount?: number };
  return { rows: result.rows ?? [], rowCount: result.rowCount ?? 0 };
}

async function executeBatch(queries: PendingQuery[]): Promise<void> {
  if (queries.length === 0) return;
  const { error } = await getClient().schema("tet_kb").rpc("api_exec_batch", {
    p_queries: queries,
  });
  if (error) throw new Error(`Supabase API transaction failed: ${error.message}`);
}

class RpcClient {
  private inTransaction = false;
  private pending: PendingQuery[] = [];

  async query<T = any>(sql: string, params: unknown[] = []) {
    const normalized = sql.trim().toUpperCase();
    if (normalized === "BEGIN") {
      this.inTransaction = true;
      return { rows: [], rowCount: 0 } as QueryResult<T>;
    }
    if (normalized === "ROLLBACK") {
      this.pending = [];
      this.inTransaction = false;
      return { rows: [], rowCount: 0 } as QueryResult<T>;
    }
    if (normalized === "COMMIT") {
      await executeBatch(this.pending);
      this.pending = [];
      this.inTransaction = false;
      return { rows: [], rowCount: 0 } as QueryResult<T>;
    }

    // Reads are needed immediately by reorderPages; writes can be committed
    // atomically by the batch RPC at COMMIT.
    if (this.inTransaction && !isReadQuery(sql)) {
      this.pending.push({ sql, params });
      return { rows: [], rowCount: 0 } as QueryResult<T>;
    }
    return execute<T>(sql, params);
  }

  release() {
    this.pending = [];
    this.inTransaction = false;
  }
}

export const pool = {
  query: <T = any>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> => execute<T>(text, params),
  connect: async (): Promise<RpcClient> => new RpcClient(),
  end: async (): Promise<void> => undefined,
};

// Graceful shutdown
const shutdown = async () => {
  await pool.end();
};
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
