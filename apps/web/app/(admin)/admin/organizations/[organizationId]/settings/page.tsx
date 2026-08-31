import { getServerAccessToken } from "@/lib/auth/supabase-server";
import { OrganizationMembersList } from "@/components/organizations/OrganizationMembersList";
import { DeleteOrganizationSection } from "@/components/organizations/DeleteOrganizationSection";
import { getOrganizationBootstrap } from "@/lib/api/organization-bootstrap";
import { Settings } from "lucide-react";
import { redirect } from "next/navigation";

export default async function OrganizationSettingsPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const token = await getServerAccessToken();
  const bootstrap = await getOrganizationBootstrap(organizationId, token, {
    includeMembers: true,
  });

  if (!bootstrap) {
    redirect("/admin");
  }
  const { organization, role, members, spaces } = bootstrap;
  const canManageMembers = role === "admin" || role === "owner";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Nhóm quản lý & quyền</h1>
        </div>
        <p className="text-muted-foreground">{organization.name}</p>
      </div>

      <div className="space-y-8">
        <p className="text-sm text-muted-foreground -mt-4">
          Nhóm quản lý dùng để quản lý thành viên và quyền cho các kho tài liệu thuộc nhóm này.
        </p>

        {canManageMembers ? (
          <section>
            <OrganizationMembersList
              organizationId={organizationId}
              initialMembers={members}
            />
          </section>
        ) : (
          <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            Chỉ admin hoặc owner mới có thể xem và quản lý danh sách thành viên.
          </p>
        )}
        {role === "owner" ? (
          <DeleteOrganizationSection
            organizationId={organizationId}
            organizationName={organization.name}
            spaceCount={spaces.length}
          />
        ) : null}
      </div>
    </div>
  );
}
