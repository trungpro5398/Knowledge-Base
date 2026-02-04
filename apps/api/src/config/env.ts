function parseIntOr(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  databaseUrl: process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL || "",
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:3000").split(","),
  webRevalidateUrl: process.env.WEB_REVALIDATE_URL || "",
  revalidateSecret: process.env.REVALIDATE_SECRET || "",
  publicCacheTtlMs: parseIntOr(process.env.PUBLIC_CACHE_TTL_MS, 15000),
  publicCacheMaxEntries: parseIntOr(process.env.PUBLIC_CACHE_MAX_ENTRIES, 200),
  internalCacheTtlMs: parseIntOr(process.env.INTERNAL_CACHE_TTL_MS, 5000),
  internalCacheMaxEntries: parseIntOr(process.env.INTERNAL_CACHE_MAX_ENTRIES, 500),
};
