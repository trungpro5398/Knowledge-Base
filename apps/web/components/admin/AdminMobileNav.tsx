"use client";

import Link from "next/link";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { LayoutDashboard, Trash2, BookOpen } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";

export function AdminMobileNav() {
  const { t } = useLocale();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t flex items-center justify-around px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
      aria-label="Admin mobile navigation"
    >
      <Link
        href="/admin"
        className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
      >
        <LayoutDashboard className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <span className="text-xs">{t("common.dashboard")}</span>
      </Link>
      <Link
        href="/kb/tet-prosys"
        className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
      >
        <BookOpen className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <span className="text-xs">{t("common.docs")}</span>
      </Link>
      <Link
        href="/admin/trash"
        className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Trash2 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        <span className="text-xs">{t("common.trash")}</span>
      </Link>
      <AdminLogoutButton variant="mobile" />
    </nav>
  );
}
