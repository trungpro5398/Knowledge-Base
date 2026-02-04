import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchBar } from "@/components/search/SearchBar";
import { QueryProvider } from "@/components/query-provider";
import { ShortcutsProvider } from "@/components/keyboard/shortcuts-provider";
import { ShortcutsHelp } from "@/components/keyboard/shortcuts-help";
import { signOut } from "@/lib/auth/actions";
import {
  LayoutDashboard,
  Trash2,
  BookOpen,
  FileText,
  LogOut,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
    <ShortcutsProvider>
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <aside className="hidden md:flex md:w-64 border-r border-border flex-col bg-card/60">
        <div className="p-5 border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Link
              href="/admin"
              className="flex items-center gap-2 font-bold text-lg hover:text-primary transition-colors"
            >
              <FileText className="h-6 w-6 text-primary" />
              Quản Trị Tài Liệu
            </Link>
            <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              Admin
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Chỉnh sửa nội dung, quản lý trang</p>
        </div>
        <nav className="p-3 flex-1 space-y-1" aria-label="Admin navigation">
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
            Dashboard
          </Link>
          <Link
            href="/admin/trash"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
            Thùng rác
          </Link>
          <div className="px-3 py-2.5">
            <SearchBar />
          </div>
        </nav>
        <div className="p-3 border-t space-y-1">
          <div className="flex justify-between items-center gap-2">
            <Link
              href="/kb/tet-prosys"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Xem Tài Liệu
            </Link>
            <ThemeToggle />
          </div>
          <form action={signOut} className="block">
            <button
              type="submit"
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </form>
        </div>
      </aside>
      
      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t flex items-center justify-around px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
        aria-label="Admin mobile navigation"
      >
        <Link
          href="/admin"
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
        >
          <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs">Dashboard</span>
        </Link>
        <Link
          href="/kb/tet-prosys"
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
        >
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs">Tài Liệu</span>
        </Link>
        <Link
          href="/admin/trash"
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
        >
          <Trash2 className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs">Trash</span>
        </Link>
      </nav>
      
      <main
        id="main-content"
        className="flex-1 overflow-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 min-w-0"
      >
        {children}
      </main>
      <ShortcutsHelp />
    </div>
    </ShortcutsProvider>
    </QueryProvider>
  );
}
