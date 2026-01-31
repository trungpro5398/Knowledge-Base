import Link from "next/link";
import { BookOpen, Settings, LogIn, UserPlus } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>
      <div className="container mx-auto px-6 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
            Knowledge Base
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Tài liệu nội bộ – Công cụ thay thế Confluence, gọn nhẹ và dễ sử dụng.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <Link
              href="/kb"
              className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base"
            >
              <BookOpen className="h-5 w-5" />
              Xem KB
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-border bg-card font-semibold hover:bg-muted transition-colors"
            >
              <Settings className="h-5 w-5" />
              Admin
            </Link>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto">
          <Link
            href="/login"
            className="card flex items-center gap-4 p-5 hover:border-primary/30 hover:shadow-md transition-all group"
          >
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20">
              <LogIn className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Đăng nhập</h3>
              <p className="text-sm text-muted-foreground">Đã có tài khoản</p>
            </div>
          </Link>
          <Link
            href="/register"
            className="card flex items-center gap-4 p-5 hover:border-primary/30 hover:shadow-md transition-all group"
          >
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20">
              <UserPlus className="h-6 w-6" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Đăng ký</h3>
              <p className="text-sm text-muted-foreground">Chỉ email @tet-edu.com</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
