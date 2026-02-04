import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/auth/supabase-server";
import { apiClient } from "@/lib/api/client";
import { CreateSpaceForm } from "@/components/spaces/CreateSpaceForm";
import { DeleteSpaceButton } from "@/components/spaces/DeleteSpaceButton";
import { FolderOpen, FileText, ExternalLink, Edit, Building2 } from "lucide-react";
import type { ApiResponse, Space } from "@/lib/api/types";

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

async function getOrganizations(token: string): Promise<Organization[]> {
  try {
    const res = await apiClient<ApiResponse<Organization[]>>("/api/organizations", { token });
    return res.data;
  } catch {
    return [];
  }
}

async function getSpaces(token: string): Promise<SpaceWithOrg[]> {
  try {
    const res = await apiClient<ApiResponse<SpaceWithOrg[]>>("/api/spaces", { token });
    return res.data;
  } catch {
    return [];
  }
}

async function getSpacesStats(token: string): Promise<SpaceStats[]> {
  try {
    const res = await apiClient<ApiResponse<SpaceStats[]>>("/api/spaces/stats", { token });
    return res.data;
  } catch {
    return [];
  }
}

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } };
  const token = session?.access_token ?? "";

  const [organizations, spaces, stats] = await Promise.all([
    getOrganizations(token),
    getSpaces(token),
    getSpacesStats(token),
  ]);

  const getSpaceStats = (spaceId: string) => {
    return stats.find((s) => s.space_id === spaceId);
  };

  // Group spaces by organization
  const spacesByOrg = spaces.reduce((acc, space) => {
    const orgId = space.organization_id || "standalone";
    if (!acc[orgId]) acc[orgId] = [];
    acc[orgId].push(space);
    return acc;
  }, {} as Record<string, SpaceWithOrg[]>);

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
                  <span>trang</span>
                </span>
                {spaceStats.total_pages > 0 && (
                  <>
                    <span>•</span>
                    <span>{spaceStats.published_pages} published</span>
                    <span>•</span>
                    <span>{spaceStats.draft_pages} draft</span>
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
            Quản lý pages
          </Link>
          <Link
            href={`/kb/${space.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Xem tài liệu
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
          <h1 className="text-2xl font-bold text-balance">Spaces</h1>
          <p className="text-muted-foreground mt-1">Quản lý spaces và trang KB</p>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="tabular-nums">
            {spaces.length} space{spaces.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
      <div className="mt-6">
        <CreateSpaceForm />
      </div>
      
      {/* Organizations & Spaces */}
      <div className="mt-8 space-y-10">
        {organizations.map((org) => {
          const orgSpaces = spacesByOrg[org.id] || [];
          return (
            <div key={org.id} className="space-y-4">
              {/* Organization Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted text-muted-foreground text-lg">
                  {org.icon || <Building2 className="h-5 w-5" aria-hidden="true" />}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">{org.name}</h2>
                    {org.description && (
                      <p className="text-sm text-muted-foreground">{org.description}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {orgSpaces.length} space{orgSpaces.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Spaces in this org */}
              <div className="rounded-xl border bg-card/50 divide-y overflow-hidden">
                {orgSpaces.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="p-3 rounded-full bg-muted mb-3">
                      <FolderOpen className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <p className="text-muted-foreground mb-1">Chưa có space nào</p>
                    <p className="text-sm text-muted-foreground">Tạo space mới cho {org.name}</p>
                  </div>
                ) : (
                  orgSpaces.map((space) => renderSpaceRow(space))
                )}
              </div>
            </div>
          );
        })}

        {/* Standalone spaces (no organization) */}
        {spacesByOrg.standalone && spacesByOrg.standalone.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Spaces độc lập</h2>
            <div className="rounded-xl border bg-card/50 divide-y overflow-hidden">
              {spacesByOrg.standalone.map((space) => renderSpaceRow(space))}
            </div>
          </div>
        )}

        {/* Empty state: only when no spaces at all */}
        {spaces.length === 0 && organizations.length === 0 && (
          <div className="rounded-2xl border bg-card/50 flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <FolderOpen className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-muted-foreground mb-2">Chưa có space nào</p>
            <p className="text-sm text-muted-foreground">Tạo space mới bằng form bên trên</p>
          </div>
        )}
      </div>
    </div>
  );
}
