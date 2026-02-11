import { getServerAccessToken } from "@/lib/auth/supabase-server";
import { serverApiGet } from "@/lib/api/server";
import { MembersList } from "@/components/spaces/MembersList";
import { DeleteSpaceSection } from "@/components/spaces/DeleteSpaceSection";
import { Settings } from "lucide-react";
import type { ApiResponse, Space, PageNode } from "@/lib/api/types";
import { redirect } from "next/navigation";

function countPagesInTree(nodes: PageNode[]): number {
  return nodes.reduce((acc, node) => {
    return acc + 1 + (node.children ? countPagesInTree(node.children) : 0);
  }, 0);
}

async function getSpace(spaceId: string, token: string): Promise<Space | null> {
  try {
    const res = await serverApiGet<ApiResponse<Space>>(`/api/spaces/${spaceId}`, token);
    return res.data;
  } catch {
    return null;
  }
}

async function getPageCount(spaceId: string, token: string): Promise<number> {
  try {
    const res = await serverApiGet<ApiResponse<PageNode[]>>(
      `/api/spaces/${spaceId}/pages/tree`,
      token
    );
    return countPagesInTree(res.data);
  } catch {
    return 0;
  }
}

export default async function SpaceSettingsPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const token = await getServerAccessToken();

  const [space, pageCount] = await Promise.all([
    getSpace(spaceId, token),
    getPageCount(spaceId, token),
  ]);

  if (!space) {
    redirect("/admin");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Cài đặt Space</h1>
        </div>
        <p className="text-muted-foreground">{space.name}</p>
      </div>

      <div className="space-y-8">
        <section>
          <MembersList spaceId={spaceId} />
        </section>
        <DeleteSpaceSection
          spaceId={spaceId}
          spaceName={space.name}
          pageCount={pageCount}
        />
      </div>
    </div>
  );
}
