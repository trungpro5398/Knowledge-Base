import { redirect } from "next/navigation";
import { getServerAccessToken } from "@/lib/auth/supabase-server";
import { serverApiGet } from "@/lib/api/server";
import type { ApiResponse, Space } from "@/lib/api/types";

async function getOrganizationSpaces(organizationId: string, token: string): Promise<Space[]> {
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

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const token = await getServerAccessToken();
  const spaces = await getOrganizationSpaces(organizationId, token);

  if (spaces.length > 0) {
    redirect(`/admin/spaces/${spaces[0]!.id}`);
  }

  redirect("/admin");
}
