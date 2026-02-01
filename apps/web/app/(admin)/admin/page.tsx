import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/auth/supabase-server";
import { apiClient } from "@/lib/api/client";
import { CreateSpaceForm } from "@/components/spaces/CreateSpaceForm";
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
  const { data: { session } } = await supabase.auth.getSession();
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

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Quản lý spaces và trang KB</p>
      </div>
      <CreateSpaceForm />
      
      {/* Organizations & Spaces */}
      <div className="mt-8 space-y-8">
        {organizations.map((org) => {
          const orgSpaces = spacesByOrg[org.id] || [];
          return (
            <div key={org.id} className="space-y-4">
              {/* Organization Header */}
              <div className="flex items-center gap-3 pb-3 border-b">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary text-lg">
                  {org.icon || <Building2 className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">{org.name}</h2>
                  {org.description && (
                    <p className="text-sm text-muted-foreground">{org.description}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {orgSpaces.length} space{orgSpaces.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Spaces in this org */}
              {orgSpaces.length === 0 ? (
                <div className="card flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <FolderOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-2">Chưa có space nào</p>
                  <p className="text-sm text-muted-foreground">Tạo space mới cho {org.name}</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {orgSpaces.map((space) => {
                    const spaceStats = getSpaceStats(space.id);
                    return (
                      <div
                        key={space.id}
                        className="card p-5 hover:border-primary/30 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                            <FolderOpen className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold mb-1">{space.name}</h3>
                            <p className="text-sm text-muted-foreground font-mono mb-3">
                              {space.slug}
                            </p>

                            {/* Stats */}
                            {spaceStats && (
                              <div className="flex items-center gap-3 mb-4 text-sm">
                                <div className="flex items-center gap-1.5">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{spaceStats.total_pages}</span>
                                  <span className="text-muted-foreground">trang</span>
                                </div>
                                {spaceStats.total_pages > 0 && (
                                  <>
                                    <div className="text-muted-foreground">•</div>
                                    <div className="text-muted-foreground">
                                      {spaceStats.published_pages} published
                                    </div>
                                    <div className="text-muted-foreground">•</div>
                                    <div className="text-muted-foreground">
                                      {spaceStats.draft_pages} draft
                                    </div>
                                  </>
                                )}
                              </div>
                            )}

                            {/* Quick Actions */}
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/admin/spaces/${space.id}/tree`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                Quản lý pages
                              </Link>
                              <Link
                                href={`/kb/${space.slug}`}
                                target="_blank"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Xem Tài Liệu
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Standalone spaces (no organization) */}
        {spacesByOrg.standalone && spacesByOrg.standalone.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Spaces độc lập</h2>
            <div className="grid gap-4">
              {spacesByOrg.standalone.map((space) => {
                const spaceStats = getSpaceStats(space.id);
                return (
                  <div
                    key={space.id}
                    className="card p-5 hover:border-primary/30 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold mb-1">{space.name}</h3>
                        <p className="text-sm text-muted-foreground font-mono mb-3">
                          {space.slug}
                        </p>

                        {spaceStats && (
                          <div className="flex items-center gap-3 mb-4 text-sm">
                            <div className="flex items-center gap-1.5">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{spaceStats.total_pages}</span>
                              <span className="text-muted-foreground">trang</span>
                            </div>
                            {spaceStats.total_pages > 0 && (
                              <>
                                <div className="text-muted-foreground">•</div>
                                <div className="text-muted-foreground">
                                  {spaceStats.published_pages} published
                                </div>
                                <div className="text-muted-foreground">•</div>
                                <div className="text-muted-foreground">
                                  {spaceStats.draft_pages} draft
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/spaces/${space.id}/tree`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Quản lý pages
                          </Link>
                          <Link
                            href={`/kb/${space.slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Xem Tài Liệu
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {spaces.length === 0 && (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <FolderOpen className="h-12 w-12 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2">Chưa có space nào</p>
            <p className="text-sm text-muted-foreground">Tạo space mới bằng form bên trên</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {spaces.map((space) => {
              const spaceStats = getSpaceStats(space.id);
              return (
                <div
                  key={space.id}
                  className="card p-5 hover:border-primary/30 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold mb-1">{space.name}</h3>
                      <p className="text-sm text-muted-foreground font-mono mb-3">
                        {space.slug}
                      </p>

                      {/* Stats */}
                      {spaceStats && (
                        <div className="flex items-center gap-3 mb-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{spaceStats.total_pages}</span>
                            <span className="text-muted-foreground">trang</span>
                          </div>
                          {spaceStats.total_pages > 0 && (
                            <>
                              <div className="text-muted-foreground">•</div>
                              <div className="text-muted-foreground">
                                {spaceStats.published_pages} published
                              </div>
                              <div className="text-muted-foreground">•</div>
                              <div className="text-muted-foreground">
                                {spaceStats.draft_pages} draft
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/spaces/${space.id}/tree`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Quản lý pages
                        </Link>
                        <Link
                          href={`/kb/${space.slug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md hover:bg-muted transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Xem KB
                        </Link>
                      </div>
                    </div>
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
