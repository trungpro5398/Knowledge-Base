import pg from "pg";
import { config } from "../config/env.js";

const { Pool } = pg;

let _pool: pg.Pool | null = null;
let _closing = false;

function getPool(): pg.Pool {
  if (!_pool) {
    if (!config.databaseUrl) {
      throw new Error(
        "DATABASE_URL environment variable is required. " +
        "Please set it to your PostgreSQL connection string."
      );
    }
    _pool = new Pool({
      connectionString: config.databaseUrl,
      max: 8,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 5000,
    });
  }
  return _pool;
}

// Export a proxy that lazily initializes the pool
export const pool = {
  query: <T extends pg.QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<pg.QueryResult<T>> => {
    return getPool().query<T>(text, params);
  },
  connect: (): Promise<pg.PoolClient> => {
    return getPool().connect();
  },
  end: (): Promise<void> => {
    if (_pool && !_closing) {
      _closing = true;
      return _pool.end().catch((err) => {
        if (err instanceof Error && err.message.includes("Called end on pool more than once")) {
          return;
        }
        throw err;
      });
    }
    return Promise.resolve();
  },
};

// Graceful shutdown
const shutdown = async () => {
  try {
    await pool.end();
  } catch (err) {
    if (err instanceof Error && err.message.includes("Called end on pool more than once")) {
      return;
    }
    throw err;
  }
};
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
