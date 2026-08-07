"use client";

import { Building2, FolderOpen } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";

interface KbContextHeaderProps {
  spaceName: string;
  organizationName?: string | null;
}

export function KbContextHeader({ spaceName, organizationName }: KbContextHeaderProps) {
  const { t } = useLocale();
  const groupName = organizationName || t("viewer.standaloneLabel");

  return (
    <div className="mb-6 grid gap-3 rounded-xl border bg-card/70 p-4 sm:grid-cols-2">
      <div className="flex min-w-0 items-start gap-3">
        <div className="rounded-lg bg-muted p-2 text-muted-foreground">
          <Building2 className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("viewer.organizationLabel")}
          </p>
          <p className="truncate text-sm font-medium" title={groupName}>
            {groupName}
          </p>
        </div>
      </div>
      <div className="flex min-w-0 items-start gap-3 sm:border-l sm:pl-4">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <FolderOpen className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("viewer.spaceLabel")}
          </p>
          <p className="truncate text-sm font-medium" title={spaceName}>
            {spaceName}
          </p>
        </div>
      </div>
    </div>
  );
}
