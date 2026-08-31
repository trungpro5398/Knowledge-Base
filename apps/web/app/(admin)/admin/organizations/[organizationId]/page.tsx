import { redirect } from "next/navigation";
import { getServerAccessToken } from "@/lib/auth/supabase-server";
import { getOrganizationBootstrap } from "@/lib/api/organization-bootstrap";

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const token = await getServerAccessToken();
  const bootstrap = await getOrganizationBootstrap(organizationId, token);
  const spaces = bootstrap?.spaces ?? [];

  if (spaces.length > 0) {
    redirect(`/admin/spaces/${spaces[0]!.id}`);
  }

  redirect("/admin");
}
