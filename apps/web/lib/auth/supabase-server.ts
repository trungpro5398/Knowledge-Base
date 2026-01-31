import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
            cookieStore.set(name, value, opts);
          });
        },
      },
    }
  );
}
