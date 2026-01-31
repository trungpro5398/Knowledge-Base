import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          const isProd = process.env.NODE_ENV === "production";
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = options
              ? {
                path: (options.path as string) ?? "/",
                maxAge: options.maxAge as number | undefined,
                expires: options.expires as Date | undefined,
                httpOnly: options.httpOnly as boolean | undefined,
                secure: (options.secure as boolean) ?? isProd,
                sameSite: (options.sameSite as "lax" | "strict" | "none") ?? "lax",
              }
              : { path: "/", sameSite: "lax" as const, secure: isProd };
            response.cookies.set(name, value, opts);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith("/admin") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
