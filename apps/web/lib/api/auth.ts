"use client";

import { createClient } from "@/lib/auth/supabase-browser";

let refreshPromise: Promise<string | null> | null = null;

export async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();

  // Get current session
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Error getting session:", error.message);
    return null;
  }

  if (!session) {
    return null;
  }

  // Check if token is expired or about to expire (within 60 seconds)
  const expiresAt = session.expires_at;
  const now = Math.floor(Date.now() / 1000);
  const isExpiringSoon = expiresAt && expiresAt - now < 60;

  if (isExpiringSoon) {
    // Prevent multiple concurrent refresh calls
    if (!refreshPromise) {
      refreshPromise = refreshToken(supabase);
    }
    const newToken = await refreshPromise;
    refreshPromise = null;
    return newToken;
  }

  return session.access_token;
}

async function refreshToken(
  supabase: ReturnType<typeof createClient>
): Promise<string | null> {
  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    console.error("Error refreshing session:", error.message);
    // Clear session on refresh failure
    await supabase.auth.signOut();
    return null;
  }

  return data.session?.access_token ?? null;
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null;
}
