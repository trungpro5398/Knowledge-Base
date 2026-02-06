import { getServerAccessToken } from "@/lib/auth/supabase-server";
import { serverApiGet } from "@/lib/api/server";
import { OrganizationMembersList } from "@/components/organizations/OrganizationMembersList";
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

export default async function OrganizationSettingsPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const token = await getServerAccessToken();

  const organization = await getOrganization(organizationId, token);
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
      </div>
    </div>
  );
}
