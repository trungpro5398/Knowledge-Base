"use client";

import Link from "next/link";
import { CreateOrganizationForm } from "@/components/organizations/CreateOrganizationForm";
import { ManageSpacesButton } from "@/components/admin/ManageSpacesButton";
import { AlertTriangle, ArrowRight, Building2, FileText, LibraryBig, RefreshCw, Settings, Sparkles } from "lucide-react";
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
  loadError?: boolean;
}

export function AdminDashboardContent({
  organizations,
  spacesByOrg,
  loadError = false,
}: AdminDashboardContentProps) {
  const { t } = useLocale();

  const spaceCountLabel = (count: number) => t("admin.spacesCount", { count });
  const spaceCount = Object.values(spacesByOrg).reduce((total, items) => total + items.length, 0);

  return (
    <div className="p-5 sm:p-8 max-w-6xl w-full mx-auto">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-balance">{t("admin.organizationsTitle")}</h1>
          <p className="text-muted-foreground mt-1">{t("admin.organizationsSubtitle")}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><LibraryBig className="h-5 w-5" aria-hidden="true" /></div>
          <div><p className="text-xs text-muted-foreground">Kho tài liệu</p><p className="text-xl font-semibold tabular-nums">{organizations.length}</p></div>
        </div>
        <div className="rounded-2xl border bg-card p-4 flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400"><FileText className="h-5 w-5" aria-hidden="true" /></div>
          <div><p className="text-xs text-muted-foreground">Khu vực nội dung</p><p className="text-xl font-semibold tabular-nums">{spaceCount}</p></div>
        </div>
        <div className="rounded-2xl border bg-card p-4 flex items-center gap-3">
          <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400"><Sparkles className="h-5 w-5" aria-hidden="true" /></div>
          <div><p className="text-xs text-muted-foreground">Trạng thái</p><p className="text-sm font-semibold">Sẵn sàng quản lý</p></div>
        </div>
      </div>

      {loadError && (
        <div
          className="mt-6 flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <p className="font-medium">{t("admin.loadErrorTitle")}</p>
              <p className="mt-1 text-muted-foreground">{t("admin.loadErrorDescription")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            {t("admin.retry")}
          </button>
        </div>
      )}

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
                    <ManageSpacesButton
                      organizationId={org.id}
                      organizationName={org.name}
                      firstSpaceId={orgSpaces[0]?.id}
                    />
                    <Link
                      href={`/admin/organizations/${org.id}/settings`}
                      className="h-9 px-3 text-sm border rounded-lg hover:bg-muted transition-colors flex items-center justify-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Người & quyền
                      <ArrowRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
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
