import { getServerAccessToken } from "@/lib/auth/supabase-server";
import { serverApiGet } from "@/lib/api/server";
import { AdminDashboardContent } from "@/components/admin/AdminDashboardContent";
import type { ApiResponse, Space } from "@/lib/api/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    const res = await serverApiGet<ApiResponse<Organization[]>>("/api/organizations", token);
    return res.data;
  } catch {
    return [];
  }
}

async function getSpaces(token: string): Promise<SpaceWithOrg[]> {
  try {
    const res = await serverApiGet<ApiResponse<SpaceWithOrg[]>>("/api/spaces", token, {
      cache: "no-store",
    });
    return res.data;
  } catch {
    return [];
  }
}

export default async function AdminDashboard() {
  const token = await getServerAccessToken();

  const [organizations, spaces] = await Promise.all([
    getOrganizations(token),
    getSpaces(token),
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
      spacesByOrg={spacesByOrg}
    />
  );
}
