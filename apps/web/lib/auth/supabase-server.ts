import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { getSupabaseEnv } from "./env";

export const createServerSupabaseClient = cache(async () => {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();
  if (!url || !key) {
    return null;
  }
  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = options
              ? {
                path: (options.path as string) ?? "/",
                maxAge: options.maxAge as number | undefined,
                expires: options.expires as Date | undefined,
                httpOnly: options.httpOnly as boolean | undefined,
                secure: (options.secure as boolean) ?? process.env.NODE_ENV === "production",
                sameSite: (options.sameSite as "lax" | "strict" | "none") ?? "lax",
              }
              : { path: "/", sameSite: "lax" as const, secure: process.env.NODE_ENV === "production" };
            try {
              // In Server Components, cookies are read-only and will throw if modified.
              cookieStore.set(name, value, opts);
            } catch {
              // Ignore in read-only contexts (e.g. RSC) to avoid hard failures.
            }
          });
        },
      },
    }
  );
});

export const getServerSession = cache(async () => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
});

export const getServerUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export const getServerAccessToken = cache(async () => {
  const session = await getServerSession();
  return session?.access_token ?? "";
});
