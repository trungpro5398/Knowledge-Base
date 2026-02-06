"use client";

import Link from "next/link";
import { Plus, Settings } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";
import { SpaceSwitcher } from "@/components/admin/SpaceSwitcher";

interface SpaceItem {
  id: string;
  name: string;
  slug: string;
  organization_id?: string | null;
}

interface OrganizationItem {
  id: string;
  name: string;
  icon: string | null;
}

interface SpaceLayoutHeaderProps {
  spaceId: string;
  spaceName: string;
  spaceSlug: string;
  spaces: SpaceItem[];
  organizations: OrganizationItem[];
}

export function SpaceLayoutHeader({
  spaceId,
  spaceName,
  spaceSlug,
  spaces,
  organizations,
}: SpaceLayoutHeaderProps) {
  const { t } = useLocale();

  return (
    <header className="shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="w-full md:max-w-sm">
          <SpaceSwitcher
            spaces={spaces}
            organizations={organizations}
            currentSpaceId={spaceId}
          />
          <p className="mt-1 px-3 text-[11px] text-muted-foreground truncate" title={`${spaceName} /kb/${spaceSlug}`}>
            {spaceName} · /kb/{spaceSlug}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
