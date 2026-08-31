import { serverApiGet } from "./server";
import type { ApiResponse, Space } from "./types";

export interface OrganizationBootstrapOrganization {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
}

export interface OrganizationBootstrapMember {
  user_id: string;
  organization_id: string;
  role: "member" | "admin" | "owner";
  created_at: string;
  user_email: string;
  user_name?: string | null;
}

export interface OrganizationBootstrap {
  organization: OrganizationBootstrapOrganization;
  role: "member" | "admin" | "owner";
  spaces: Space[];
  members: OrganizationBootstrapMember[];
}

export async function getOrganizationBootstrap(
  organizationId: string,
  token: string,
  options?: { includeMembers?: boolean }
): Promise<OrganizationBootstrap | null> {
  try {
    const suffix = options?.includeMembers ? "?members=1" : "";
    const response = await serverApiGet<ApiResponse<OrganizationBootstrap>>(
      `/api/organizations/${organizationId}/bootstrap${suffix}`,
      token
    );
    return response.data;
  } catch {
    return null;
  }
}
