import { getServerAccessToken } from "@/lib/auth/supabase-server";
import { getSpaceBootstrap } from "@/lib/api/space-bootstrap";
import { getSpaceMembers } from "@/lib/api/space-members";
import { MembersList } from "@/components/spaces/MembersList";
import { DeleteSpaceSection } from "@/components/spaces/DeleteSpaceSection";
import { EditSpaceForm } from "@/components/spaces/EditSpaceForm";
import { Settings } from "lucide-react";
import type { PageNode } from "@/lib/api/types";
import { redirect } from "next/navigation";

function countPagesInTree(nodes: PageNode[]): number {
  return nodes.reduce((acc, node) => {
    return acc + 1 + (node.children ? countPagesInTree(node.children) : 0);
  }, 0);
}

export default async function SpaceSettingsPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const token = await getServerAccessToken();
  const [bootstrap, members] = await Promise.all([
    getSpaceBootstrap(spaceId, token),
    getSpaceMembers(spaceId, token),
  ]);

  if (!bootstrap) {
    redirect("/admin");
  }
  const { space } = bootstrap;
  const pageCount = countPagesInTree(bootstrap.tree);

  if (bootstrap.role !== "admin") {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Cài đặt kho tài liệu</h1>
          </div>
          <p className="text-muted-foreground">
            Chỉ quản trị viên mới có thể thay đổi cài đặt của kho này.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Cài đặt kho tài liệu</h1>
        </div>
        <p className="text-muted-foreground">{space.name}</p>
      </div>

      <div className="space-y-8">
        <EditSpaceForm space={space} />
        <section>
          <MembersList spaceId={spaceId} initialMembers={members ?? undefined} />
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
