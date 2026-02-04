import { createServerSupabaseClient } from "@/lib/auth/supabase-server";
import { apiClient } from "@/lib/api/client";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { SpaceLayoutHeader } from "@/components/admin/SpaceLayoutHeader";
import { SpaceSidebarContent } from "@/components/admin/SpaceSidebarContent";
import { SpaceNotFound } from "@/components/admin/SpaceNotFound";
import type { TreeNode } from "@/components/kb/PageTree";
import type { ApiResponse, Space, PageNode } from "@/lib/api/types";

async function getSpace(spaceId: string, token: string): Promise<Space | null> {
  try {
    const res = await apiClient<ApiResponse<Space>>(`/api/spaces/${spaceId}`, { token });
    return res.data;
  } catch {
    return null;
  }
}

async function getTree(spaceId: string, token: string): Promise<TreeNode[]> {
  try {
    const res = await apiClient<ApiResponse<PageNode[]>>(`/api/spaces/${spaceId}/pages/tree`, { token });
    return res.data as TreeNode[];
  } catch {
    return [];
  }
}

async function getSpaces(token: string): Promise<Space[]> {
  try {
    const res = await apiClient<ApiResponse<Space[]>>("/api/spaces", { token });
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
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } };
  const token = session?.access_token ?? "";

  const [space, tree, spaces] = await Promise.all([
    getSpace(spaceId, token),
    getTree(spaceId, token),
    getSpaces(token),
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
