import Link from "next/link";
import { getServerAccessToken } from "@/lib/auth/supabase-server";
import { serverApiGet } from "@/lib/api/server";
import { CreateSpaceForm } from "@/components/spaces/CreateSpaceForm";
import { DeleteSpaceButton } from "@/components/spaces/DeleteSpaceButton";
import { FolderOpen, FileText, ExternalLink, Edit, Building2, Settings, ArrowLeft } from "lucide-react";
import type { ApiResponse, Space } from "@/lib/api/types";
import { redirect } from "next/navigation";

interface Organization {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
}

interface SpaceStats {
  space_id: string;
  total_pages: number;
  published_pages: number;
  draft_pages: number;
}

async function getOrganization(organizationId: string, token: string): Promise<Organization | null> {
  try {
    const res = await serverApiGet<ApiResponse<Organization>>(
      `/api/organizations/${organizationId}`,
      token
    );
    return res.data;
  } catch {
    return null;
  }
}

async function getOrgSpaces(organizationId: string, token: string): Promise<Space[]> {
  try {
    const res = await serverApiGet<ApiResponse<Space[]>>(
      `/api/organizations/${organizationId}/spaces`,
      token
    );
    return res.data ?? [];
  } catch {
    return [];
  }
}

async function getSpacesStats(token: string): Promise<SpaceStats[]> {
  try {
    const res = await serverApiGet<ApiResponse<SpaceStats[]>>("/api/spaces/stats", token);
    return res.data ?? [];
  } catch {
    return [];
  }
}

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const token = await getServerAccessToken();

  const [organization, spaces, stats] = await Promise.all([
    getOrganization(organizationId, token),
    getOrgSpaces(organizationId, token),
    getSpacesStats(token),
  ]);

  if (!organization) {
    redirect("/admin");
  }

  const getSpaceStats = (spaceId: string) => stats.find((s) => s.space_id === spaceId);

  return (
    <div className="p-6 sm:p-8 max-w-5xl w-full mx-auto">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại Spaces
      </Link>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted text-muted-foreground text-xl">
            {organization.icon || <Building2 className="h-6 w-6" aria-hidden="true" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{organization.name}</h1>
            {organization.description && (
              <p className="text-muted-foreground mt-0.5">{organization.description}</p>
            )}
          </div>
        </div>
        <Link
          href={`/admin/organizations/${organizationId}/settings`}
          className="h-9 px-3 text-sm border rounded-lg hover:bg-muted transition-colors flex items-center gap-2 w-fit"
        >
          <Settings className="h-4 w-4" />
          Cài đặt
        </Link>
      </div>

      {/* Create space form - trong context của organization */}
      <div className="mb-8">
        <CreateSpaceForm organizationId={organizationId} />
      </div>

      {/* Danh sách spaces - giống pages trong space */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Spaces ({spaces.length})
        </h2>
        {spaces.length === 0 ? (
          <div className="rounded-xl border bg-card/50 flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <FolderOpen className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-muted-foreground mb-2">Chưa có space nào</p>
            <p className="text-sm text-muted-foreground">Tạo space mới bằng form bên trên</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card/50 divide-y overflow-hidden">
            {spaces.map((space) => {
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
            })}
          </div>
        )}
      </div>
    </div>
  );
}
