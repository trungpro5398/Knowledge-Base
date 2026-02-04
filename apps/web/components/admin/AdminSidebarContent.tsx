"use client";

import Link from "next/link";
import { SearchBar } from "@/components/search/SearchBar";
import { LocaleToggle } from "@/components/locale-toggle";
import { AdminLogoutButton } from "./AdminLogoutButton";
import { LayoutDashboard, Trash2, BookOpen, FileText } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";

export function AdminSidebarContent() {
  const { t } = useLocale();

  return (
    <>
      <div className="p-5 border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
        <div className="flex items-center justify-between gap-2 mb-2">
          <Link
            href="/admin"
            className="flex items-center gap-2 font-bold text-lg hover:text-primary transition-colors"
          >
            <FileText className="h-6 w-6 text-primary" aria-hidden="true" />
            {t("admin.title")}
          </Link>
          <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
            {t("common.admin")}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{t("admin.subtitle")}</p>
      </div>
      <nav className="p-3 flex-1 space-y-1" aria-label="Admin navigation">
        <Link
          href="/admin"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
        >
          <LayoutDashboard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {t("common.dashboard")}
        </Link>
        <Link
          href="/admin/trash"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          {t("common.trash")}
        </Link>
        <div className="px-3 py-2.5">
          <SearchBar />
        </div>
      </nav>
      <div className="p-3 border-t space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/kb/tet-prosys"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {t("header.viewDocs")}
          </Link>
          <LocaleToggle />
        </div>
        <AdminLogoutButton variant="sidebar" />
      </div>
    </>
  );
}
