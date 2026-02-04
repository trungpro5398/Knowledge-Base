/**
 * Supabase URL and key for the web app.
 * Supports: ANON_KEY (legacy), PUBLISHABLE_KEY, PUBLISHABLE_DEFAULT_KEY (dashboard).
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim();
  return { url: url ?? "", key: key ?? "" };
}
