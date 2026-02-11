import { getServerAccessToken } from "@/lib/auth/supabase-server";
import { serverApiGet } from "@/lib/api/server";
import { OrganizationMembersList } from "@/components/organizations/OrganizationMembersList";
import { DeleteOrganizationSection } from "@/components/organizations/DeleteOrganizationSection";
import { Settings } from "lucide-react";
import type { ApiResponse } from "@/lib/api/types";
import { redirect } from "next/navigation";

interface Organization {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
}

async function getOrganization(
  organizationId: string,
  token: string
): Promise<Organization | null> {
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

async function getSpaceCount(organizationId: string, token: string): Promise<number> {
  try {
    const res = await serverApiGet<{ data: unknown[] }>(
      `/api/organizations/${organizationId}/spaces`,
      token
    );
    return res.data?.length ?? 0;
  } catch {
    return 0;
  }
}

export default async function OrganizationSettingsPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const token = await getServerAccessToken();

  const [organization, spaceCount] = await Promise.all([
    getOrganization(organizationId, token),
    getSpaceCount(organizationId, token),
  ]);

  if (!organization) {
    redirect("/admin");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Cài đặt Organization</h1>
        </div>
        <p className="text-muted-foreground">{organization.name}</p>
      </div>

      <div className="space-y-8">
        <section>
          <OrganizationMembersList organizationId={organizationId} />
        </section>
        <DeleteOrganizationSection
          organizationId={organizationId}
          organizationName={organization.name}
          spaceCount={spaceCount}
        />
      </div>
    </div>
  );
}
