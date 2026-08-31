import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/auth/env";
import { isAllowedTetEmail } from "@/lib/auth/domain";
import { safeRedirectPath } from "@/lib/auth/redirect";

const isProd = process.env.NODE_ENV === "production";

function toCookieOpts(opts?: Record<string, unknown>) {
  return {
    path: (opts?.path as string) ?? "/",
    ...opts,
    secure: (opts?.secure as boolean) ?? isProd,
    sameSite: (opts?.sameSite as "lax" | "strict" | "none") ?? "lax",
  };
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));
  const { url, key } = getSupabaseEnv();

  if (code) {
    const responseRedirect = NextResponse.redirect(`${origin}${next}`);
    const collected: { name: string; value: string; options?: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
      url,
      key,
      {
        cookies: {
          getAll() {
            return request.headers.get("cookie")?.split(";").map((c) => {
              const [name, ...v] = c.trim().split("=");
              return { name, value: v.join("=").trim() };
            }) ?? [];
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach((c) => collected.push(c));
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (!isAllowedTetEmail(data.user?.email)) {
        await supabase.auth.signOut();
        const domainErrorRedirect = NextResponse.redirect(`${origin}/login?error=domain`);
        collected.forEach(({ name, value, options }) => {
          domainErrorRedirect.cookies.set(name, value, toCookieOpts(options));
        });
        return domainErrorRedirect;
      }
      collected.forEach(({ name, value, options }) => {
        responseRedirect.cookies.set(name, value, toCookieOpts(options));
      });
      return responseRedirect;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
