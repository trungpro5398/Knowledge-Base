import pg from "pg";
import { config } from "../config/env.js";

const { Pool } = pg;

function createPool(): pg.Pool {
  if (!config.databaseUrl) {
    throw new Error(
      "DATABASE_URL environment variable is required. " +
      "Please set it to your PostgreSQL connection string."
    );
  }
  return new Pool({
    connectionString: config.databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

export const pool = createPool();

// Graceful shutdown
process.on("SIGTERM", async () => {
  await pool.end();
});

process.on("SIGINT", async () => {
  await pool.end();
});
