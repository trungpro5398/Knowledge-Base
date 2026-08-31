import { getServerAccessToken } from "@/lib/auth/supabase-server";
import { getSpaceBootstrap } from "@/lib/api/space-bootstrap";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { SpaceLayoutHeader } from "@/components/admin/SpaceLayoutHeader";
import { SpaceSidebarContent } from "@/components/admin/SpaceSidebarContent";
import { SpaceNotFound } from "@/components/admin/SpaceNotFound";
import { QueryProvider } from "@/components/query-provider";
import type { TreeNode } from "@/components/kb/PageTree";

export default async function SpaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const token = await getServerAccessToken();
  const bootstrap = await getSpaceBootstrap(spaceId, token);

  if (!bootstrap) {
    return <SpaceNotFound />;
  }
  const { space, spaces, organizations } = bootstrap;
  const tree = bootstrap.tree as TreeNode[];

  const useGroupedSidebar = space.slug === "tet-prosys";
  const enableDragAndDrop = true;

  return (
    <QueryProvider>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <SpaceLayoutHeader
          spaceId={spaceId}
          spaceName={space.name}
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
    </QueryProvider>
  );
}
