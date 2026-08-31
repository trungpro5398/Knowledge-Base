import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/auth/env";
import { safeRedirectPath } from "@/lib/auth/redirect";

const isProd = process.env.NODE_ENV === "production";

function toCookieOpts(opts?: Record<string, unknown>): Record<string, unknown> {
  const base: Record<string, unknown> = {
    path: (opts?.path as string) ?? "/",
    secure: (opts?.secure as boolean) ?? isProd,
    sameSite: (opts?.sameSite as "lax" | "strict" | "none") ?? "lax",
  };
  if (opts?.maxAge != null) base.maxAge = opts.maxAge;
  if (opts?.expires != null) base.expires = opts.expires;
  if (opts?.httpOnly != null) base.httpOnly = opts.httpOnly;
  return base;
}

function createSupabaseServerClient(
  url: string,
  key: string,
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  collected: { name: string; value: string; options?: Record<string, unknown> }[]
) {
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach((cookie) => collected.push(cookie));
      },
    },
  });
}

function applyCookies(
  response: NextResponse,
  collected: { name: string; value: string; options?: Record<string, unknown> }[]
) {
  for (const { name, value, options } of collected) {
    response.cookies.set(name, value, toCookieOpts(options) as {
      path?: string;
      maxAge?: number;
      expires?: Date;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: "lax" | "strict" | "none";
    });
  }
}

export async function GET(request: NextRequest) {
  const { url, key } = getSupabaseEnv();
  if (!url || !key) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }

  const next = safeRedirectPath(request.nextUrl.searchParams.get("next"));
  const callbackUrl = new URL("/callback", request.url);
  callbackUrl.searchParams.set("next", next);
  const cookieStore = await cookies();
  const collected: { name: string; value: string; options?: Record<string, unknown> }[] = [];
  const supabase = createSupabaseServerClient(url, key, cookieStore, collected);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        hd: "tet-edu.com",
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }

  const response = NextResponse.redirect(data.url);
  applyCookies(response, collected);
  return response;
}

export async function POST(request: NextRequest) {
  const { url, key } = getSupabaseEnv();
  if (!url || !key) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  let body: { email?: string; password?: string; redirectTo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { email, password, redirectTo } = body;
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const collected: { name: string; value: string; options?: Record<string, unknown> }[] = [];

  const supabase = createSupabaseServerClient(url, key, cookieStore, collected);

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const res = NextResponse.redirect(new URL(safeRedirectPath(redirectTo), request.url), { status: 302 });
  applyCookies(res, collected);
  return res;
}
