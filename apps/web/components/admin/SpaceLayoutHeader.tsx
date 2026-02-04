"use client";

import Link from "next/link";
import { Plus, Settings } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";

interface SpaceLayoutHeaderProps {
  spaceId: string;
  spaceName: string;
  spaceSlug: string;
}

export function SpaceLayoutHeader({
  spaceId,
  spaceName,
  spaceSlug,
}: SpaceLayoutHeaderProps) {
  const { t } = useLocale();

  return (
    <header className="shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{t("sidebar.spaces")}</span>
          <h1 className="text-lg font-semibold">{spaceName}</h1>
          <span className="text-xs text-muted-foreground font-mono">
            /kb/{spaceSlug}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/spaces/${spaceId}/settings`}
            className="h-9 px-3 text-sm border rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            {t("common.settings")}
          </Link>
          <Link
            href={`/admin/spaces/${spaceId}/pages/new`}
            className="btn-primary h-9 px-3 text-sm gap-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("page.createButton")}
          </Link>
        </div>
      </div>
    </header>
  );
}
