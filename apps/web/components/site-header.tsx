"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Search, LogIn, UserPlus, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/admin")) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors"
        >
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">Knowledge Base for TET</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/kb"
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Tìm kiếm / Xem KB</span>
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Đăng nhập</span>
          </Link>
          <Link
            href="/register"
            className="flex items-center gap-1.5 rounded-md px-2 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Chỉ email @tet-edu.com"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden md:inline text-xs">Đăng ký (@tet-edu.com)</span>
          </Link>
          {isLoggedIn && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
