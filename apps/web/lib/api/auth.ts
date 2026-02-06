"use client";

import { createClient } from "@/lib/auth/supabase-browser";

let refreshPromise: Promise<string | null> | null = null;
let cachedAccessToken: string | null = null;
let cachedExpiresAt = 0;

function clearCachedToken() {
  cachedAccessToken = null;
  cachedExpiresAt = 0;
}

export async function getAccessToken(): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedExpiresAt - now > 60) {
    return cachedAccessToken;
  }

  const supabase = createClient();

  // Get current session
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Error getting session:", error.message);
    clearCachedToken();
    return null;
  }

  if (!session) {
    clearCachedToken();
    return null;
  }

  // Check if token is expired or about to expire (within 60 seconds)
  const expiresAt = session.expires_at;
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

  cachedAccessToken = session.access_token;
  cachedExpiresAt = expiresAt ?? now + 300;
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
    clearCachedToken();
    return null;
  }

  const session = data.session;
  if (!session?.access_token) {
    clearCachedToken();
    return null;
  }

  cachedAccessToken = session.access_token;
  cachedExpiresAt = session.expires_at ?? Math.floor(Date.now() / 1000) + 300;
  return session.access_token;
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken();
  return token !== null;
}
