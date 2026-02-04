import { AdminSidebarContent } from "@/components/admin/AdminSidebarContent";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { QueryProvider } from "@/components/query-provider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
    <div className="min-h-[calc(100dvh-3.5rem)] flex flex-col md:flex-row bg-background">
      <aside className="hidden md:flex md:w-64 border-r border-border flex-col bg-card/60">
        <AdminSidebarContent />
      </aside>

      <AdminMobileNav />
      
      <main
        id="main-content"
        className="flex-1 overflow-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 min-w-0"
      >
        {children}
      </main>
    </div>
    </QueryProvider>
  );
}
