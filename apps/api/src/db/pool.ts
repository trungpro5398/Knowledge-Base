import pg from "pg";
import { config } from "../config/env.js";

const { Pool } = pg;

export const pool = config.databaseUrl
  ? new Pool({ connectionString: config.databaseUrl, max: 20 })
  : null;
