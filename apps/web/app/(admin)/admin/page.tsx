import { createServerSupabaseClient } from "@/lib/auth/supabase-server";
import { apiClient } from "@/lib/api/client";
import { AdminDashboardContent } from "@/components/admin/AdminDashboardContent";
import type { ApiResponse, Space } from "@/lib/api/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    const res = await apiClient<ApiResponse<SpaceWithOrg[]>>("/api/spaces", {
      token,
      cache: "no-store",
    });
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

  const spacesByOrg = spaces.reduce((acc, space) => {
    const orgId = space.organization_id || "standalone";
    if (!acc[orgId]) acc[orgId] = [];
    acc[orgId].push(space);
    return acc;
  }, {} as Record<string, SpaceWithOrg[]>);

  return (
    <AdminDashboardContent
      organizations={organizations}
      spaces={spaces}
      stats={stats}
      spacesByOrg={spacesByOrg}
    />
  );
}
