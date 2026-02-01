import Link from "next/link";
import { BookOpen, Settings, LogIn, UserPlus } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/auth/supabase-server";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  const isLoggedIn = !!session?.user;

  return (
    <main className="min-h-screen">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>
      <div className="container mx-auto px-6 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
            Knowledge Base for TET
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
            Tài liệu vận hành, quy trình và quyết định nội bộ của TET.
          </p>
          <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Luôn cập nhật, dễ tìm, dễ hiểu.
          </p>

          {/* Primary CTA – chỉ 1 hành động chính */}
          <div className="flex flex-col items-center gap-4 mb-12">
            <Link
              href="/kb"
              className="btn-primary inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold"
            >
              <BookOpen className="h-5 w-5" />
              Xem Knowledge Base
            </Link>
            <p className="text-sm text-muted-foreground max-w-md">
              Một số nội dung yêu cầu đăng nhập bằng email @tet-edu.com
            </p>
            {isLoggedIn && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span className="rounded-md bg-muted px-2 py-0.5 font-medium">
                  Admin Console
                </span>
              </Link>
            )}
          </div>

          {/* Secondary – Đăng nhập / Đăng ký (subtle) */}
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Đăng nhập
            </Link>
            <span className="text-border">·</span>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Đăng ký (chỉ email @tet-edu.com)
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
