import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SearchBar } from "@/components/search/SearchBar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r flex flex-col">
        <div className="p-4 border-b">
          <Link href="/admin" className="font-bold text-lg">KB Admin</Link>
        </div>
        <nav className="p-2 flex-1 space-y-1">
          <Link href="/admin" className="block px-3 py-2 rounded hover:bg-muted">
            Dashboard
          </Link>
          <Link href="/admin/trash" className="block px-3 py-2 rounded hover:bg-muted">
            Recycle bin
          </Link>
          <div className="px-3 py-2">
            <SearchBar />
          </div>
        </nav>
        <div className="p-2 border-t flex justify-between items-center">
          <Link href="/kb" className="text-sm text-muted-foreground hover:underline">
            View KB
          </Link>
          <ThemeToggle />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
