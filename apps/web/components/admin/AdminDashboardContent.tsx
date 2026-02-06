"use client";

import Link from "next/link";
import { CreateOrganizationForm } from "@/components/organizations/CreateOrganizationForm";
import { Building2, FolderOpen, Settings } from "lucide-react";
import type { Space } from "@/lib/api/types";
import { useLocale } from "@/lib/i18n/locale-provider";

interface Organization {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
}

interface SpaceWithOrg extends Space {
  organization_id?: string | null;
}

interface AdminDashboardContentProps {
  organizations: Organization[];
  spacesByOrg: Record<string, SpaceWithOrg[]>;
}

export function AdminDashboardContent({
  organizations,
  spacesByOrg,
}: AdminDashboardContentProps) {
  const { t } = useLocale();

  const spaceCountLabel = (count: number) => t("admin.spacesCount", { count });

  return (
    <div className="p-6 sm:p-8 max-w-5xl w-full mx-auto">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-balance">{t("admin.organizationsTitle")}</h1>
          <p className="text-muted-foreground mt-1">{t("admin.organizationsSubtitle")}</p>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="tabular-nums">{t("admin.organizationsCount", { count: organizations.length })}</span>
        </div>
      </div>
      <div className="mt-8 space-y-6">
        <CreateOrganizationForm />

        {organizations.length === 0 ? (
          <div className="rounded-xl border bg-card/50 flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-muted mb-3">
              <Building2 className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-muted-foreground mb-1">{t("admin.noOrganizations")}</p>
            <p className="text-sm text-muted-foreground">{t("admin.createOrganizationAbove")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {organizations.map((org) => {
              const orgSpaces = spacesByOrg[org.id] || [];
              return (
                <div key={org.id} className="rounded-xl border bg-card/50 p-4 md:p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted text-muted-foreground text-lg shrink-0">
                        {org.icon || <Building2 className="h-5 w-5" aria-hidden="true" />}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold truncate">{org.name}</h2>
                        {org.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{org.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{t("admin.clickToManageSpaces")}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {spaceCountLabel(orgSpaces.length)}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Link
                      href={`/admin/organizations/${org.id}`}
                      className="btn-primary h-9 px-3 text-sm gap-2"
                    >
                      <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("admin.manageSpaces")}
                    </Link>
                    <Link
                      href={`/admin/organizations/${org.id}/settings`}
                      className="h-9 px-3 text-sm border rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      {t("common.settings")}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
