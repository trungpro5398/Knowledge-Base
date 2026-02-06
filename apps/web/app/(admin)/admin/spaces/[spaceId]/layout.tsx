import { getServerAccessToken } from "@/lib/auth/supabase-server";
import { serverApiGet } from "@/lib/api/server";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { SpaceLayoutHeader } from "@/components/admin/SpaceLayoutHeader";
import { SpaceSidebarContent } from "@/components/admin/SpaceSidebarContent";
import { SpaceNotFound } from "@/components/admin/SpaceNotFound";
import type { TreeNode } from "@/components/kb/PageTree";
import type { ApiResponse, Space, PageNode } from "@/lib/api/types";

interface SpaceWithOrg extends Space {
  organization_id?: string | null;
}

interface Organization {
  id: string;
  name: string;
  icon: string | null;
}

async function getSpace(spaceId: string, token: string): Promise<SpaceWithOrg | null> {
  try {
    const res = await serverApiGet<ApiResponse<SpaceWithOrg>>(`/api/spaces/${spaceId}`, token);
    return res.data;
  } catch {
    return null;
  }
}

async function getTree(spaceId: string, token: string): Promise<TreeNode[]> {
  try {
    const res = await serverApiGet<ApiResponse<PageNode[]>>(
      `/api/spaces/${spaceId}/pages/tree`,
      token
    );
    return res.data as TreeNode[];
  } catch {
    return [];
  }
}

async function getSpaces(token: string): Promise<SpaceWithOrg[]> {
  try {
    const res = await serverApiGet<ApiResponse<SpaceWithOrg[]>>("/api/spaces", token);
    return res.data;
  } catch {
    return [];
  }
}

async function getOrganizations(token: string): Promise<Organization[]> {
  try {
    const res = await serverApiGet<ApiResponse<Organization[]>>("/api/organizations", token);
    return res.data;
  } catch {
    return [];
  }
}

export default async function SpaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const token = await getServerAccessToken();

  const [space, tree, spaces, organizations] = await Promise.all([
    getSpace(spaceId, token),
    getTree(spaceId, token),
    getSpaces(token),
    getOrganizations(token),
  ]);

  if (!space) {
    return <SpaceNotFound />;
  }

  const useGroupedSidebar = space.slug === "tet-prosys";
  const enableDragAndDrop = true;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <SpaceLayoutHeader
        spaceId={spaceId}
        spaceName={space.name}
        spaceSlug={space.slug}
        spaces={spaces}
        organizations={organizations}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <CollapsibleSidebar
          storageKey="admin-space-sidebar"
          resizable
          responsive="hidden lg:flex"
          className="bg-card/95 dark:bg-card/95"
        >
          <SpaceSidebarContent
            spaceId={spaceId}
            space={space}
            tree={tree}
            spaces={spaces}
            useGroupedSidebar={useGroupedSidebar}
            enableDragAndDrop={enableDragAndDrop}
          />
        </CollapsibleSidebar>

        <section className="flex-1 overflow-y-auto min-w-0" aria-label="Editor content">
          {children}
        </section>
      </div>
    </div>
  );
}
