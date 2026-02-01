import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/auth/env";

const isProd = process.env.NODE_ENV === "production";

function cookieOptions(opts?: Record<string, unknown>) {
  return {
    path: (opts?.path as string) ?? "/",
    maxAge: opts?.maxAge as number | undefined,
    expires: opts?.expires as Date | undefined,
    httpOnly: opts?.httpOnly as boolean | undefined,
    secure: (opts?.secure as boolean) ?? isProd,
    sameSite: (opts?.sameSite as "lax" | "strict" | "none") ?? "lax",
  };
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
  const { email, password, redirectTo = "/admin" } = body;
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 }
    );
  }

  const collected: { name: string; value: string; options?: Record<string, unknown> }[] = [];
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach((c) => collected.push(c));
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const res = NextResponse.redirect(new URL(redirectTo, request.url), { status: 302 });
  collected.forEach(({ name, value, options }) => {
    res.cookies.set(name, value, cookieOptions(options));
  });
  return res;
}
