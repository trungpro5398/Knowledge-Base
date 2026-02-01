import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchBar } from "@/components/search/SearchBar";
import { QueryProvider } from "@/components/query-provider";
import {
  LayoutDashboard,
  Trash2,
  BookOpen,
  FileText,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 border-r border-border flex flex-col bg-card/50">
        <div className="p-5 border-b">
          <Link
            href="/admin"
            className="flex items-center gap-2 font-bold text-lg hover:text-primary transition-colors"
          >
            <FileText className="h-6 w-6 text-primary" />
            KB Admin
          </Link>
        </div>
        <nav className="p-3 flex-1 space-y-1">
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
        <div className="p-3 border-t flex justify-between items-center gap-2">
          <Link
            href="/kb"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            Xem KB
          </Link>
          <ThemeToggle />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
    </QueryProvider>
  );
}
