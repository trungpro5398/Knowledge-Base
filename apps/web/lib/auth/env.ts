/**
 * Supabase URL and publishable key for the web app.
 * Supports both env names: NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy)
 * and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (Supabase dashboard).
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  return { url: url ?? "", key: key ?? "" };
}
