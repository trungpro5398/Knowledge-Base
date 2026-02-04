"use client";

import Link from "next/link";
import { CreateSpaceForm } from "@/components/spaces/CreateSpaceForm";
import { DeleteSpaceButton } from "@/components/spaces/DeleteSpaceButton";
import { FolderOpen, FileText, ExternalLink, Edit, Building2, Settings } from "lucide-react";
import type { Space } from "@/lib/api/types";
import { useLocale } from "@/lib/i18n/locale-provider";

interface SpaceStats {
  space_id: string;
  total_pages: number;
  published_pages: number;
  draft_pages: number;
}

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
  spaces: SpaceWithOrg[];
  stats: SpaceStats[];
  spacesByOrg: Record<string, SpaceWithOrg[]>;
}

export function AdminDashboardContent({
  organizations,
  spaces,
  stats,
  spacesByOrg,
}: AdminDashboardContentProps) {
  const { t } = useLocale();

  const getSpaceStats = (spaceId: string) =>
    stats.find((s) => s.space_id === spaceId);

  const spaceCountLabel = (count: number) =>
    `${count} ${count === 1 ? t("common.space") : t("common.spaces")}`;

  const renderSpaceRow = (space: SpaceWithOrg) => {
    const spaceStats = getSpaceStats(space.id);
    return (
      <div
        key={space.id}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FolderOpen className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold truncate">{space.name}</h3>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                /kb/{space.slug}
              </code>
            </div>
            {spaceStats && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="font-medium text-foreground">{spaceStats.total_pages}</span>
                  <span>{t("common.pages")}</span>
                </span>
                {spaceStats.total_pages > 0 && (
                  <>
                    <span>•</span>
                    <span>{spaceStats.published_pages} {t("common.published")}</span>
                    <span>•</span>
                    <span>{spaceStats.draft_pages} {t("common.draft")}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <Link
            href={`/admin/spaces/${space.id}`}
            className="btn-primary h-9 px-3 text-sm gap-2"
          >
            <Edit className="h-3.5 w-3.5" aria-hidden="true" />
            {t("admin.managePages")}
          </Link>
          <Link
            href={`/kb/${space.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            {t("admin.viewDocs")}
          </Link>
          <DeleteSpaceButton
            spaceId={space.id}
            spaceName={space.name}
            pageCount={getSpaceStats(space.id)?.total_pages ?? 0}
            className="h-9"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 sm:p-8 max-w-5xl w-full mx-auto">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-balance">{t("admin.spacesTitle")}</h1>
          <p className="text-muted-foreground mt-1">{t("admin.spacesSubtitle")}</p>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="tabular-nums">
            {spaceCountLabel(spaces.length)}
          </span>
        </div>
      </div>
      <div className="mt-8 space-y-10">
        {organizations.map((org) => {
          const orgSpaces = spacesByOrg[org.id] || [];
          return (
            <div key={org.id} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/admin/organizations/${org.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0 group"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted text-muted-foreground text-lg shrink-0 group-hover:bg-muted/80 transition-colors">
                    {org.icon || <Building2 className="h-5 w-5" aria-hidden="true" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold group-hover:text-primary transition-colors truncate">{org.name}</h2>
                    {org.description && (
                      <p className="text-sm text-muted-foreground truncate">{org.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{t("admin.clickToManageSpaces")}</p>
                  </div>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/admin/organizations/${org.id}/settings`}
                    className="h-9 px-3 text-sm border rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Settings className="h-4 w-4" />
                    {t("common.settings")}
                  </Link>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {spaceCountLabel(orgSpaces.length)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border bg-card/50 divide-y overflow-hidden">
                {orgSpaces.length === 0 ? (
                  <Link
                    href={`/admin/organizations/${org.id}`}
                    className="flex flex-col items-center justify-center py-10 text-center hover:bg-muted/30 transition-colors"
                  >
                    <div className="p-3 rounded-full bg-muted mb-3">
                      <FolderOpen className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <p className="text-muted-foreground mb-1">{t("admin.noSpaces")}</p>
                    <p className="text-sm text-muted-foreground">{t("admin.noSpacesInOrg", { name: org.name })}</p>
                  </Link>
                ) : (
                  orgSpaces.map((space) => renderSpaceRow(space))
                )}
              </div>
            </div>
          );
        })}

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t("admin.standaloneSpaces")}</h2>
          <CreateSpaceForm />
          {spacesByOrg.standalone && spacesByOrg.standalone.length > 0 ? (
            <div className="rounded-xl border bg-card/50 divide-y overflow-hidden">
              {spacesByOrg.standalone.map((space) => renderSpaceRow(space))}
            </div>
          ) : (
            <div className="rounded-xl border bg-card/50 flex flex-col items-center justify-center py-10 text-center">
              <div className="p-3 rounded-full bg-muted mb-3">
                <FolderOpen className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="text-muted-foreground mb-1">{t("admin.noSpaces")}</p>
              <p className="text-sm text-muted-foreground">{t("admin.createSpaceAbove")}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
