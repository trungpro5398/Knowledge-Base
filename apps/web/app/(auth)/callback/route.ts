import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (code) {
    const responseRedirect = NextResponse.redirect(`${origin}${next}`);
    const collected: { name: string; value: string; options?: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      collected.forEach(({ name, value, options }) => {
        responseRedirect.cookies.set(name, value, { path: "/", ...options });
      });
      return responseRedirect;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
