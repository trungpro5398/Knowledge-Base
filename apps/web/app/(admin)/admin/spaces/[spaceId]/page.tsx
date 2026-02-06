import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAccessToken } from "@/lib/auth/supabase-server";
import { serverApiGet } from "@/lib/api/server";
import type { ApiResponse, PageNode } from "@/lib/api/types";

async function getFirstPageId(spaceId: string, token: string): Promise<string | null> {
  try {
    const res = await serverApiGet<ApiResponse<PageNode[]>>(
      `/api/spaces/${spaceId}/pages/tree`,
      token
    );
    const tree = res.data;
    if (tree.length === 0) return null;
    // Get first page (depth-first)
    const getFirst = (nodes: PageNode[]): PageNode | null => {
      if (nodes.length === 0) return null;
      return nodes[0]!;
    };
    const first = getFirst(tree);
    return first?.id ?? null;
  } catch {
    return null;
  }
}

export default async function SpacePage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const token = await getServerAccessToken();

  const firstPageId = await getFirstPageId(spaceId, token);

  if (firstPageId) {
    redirect(`/admin/spaces/${spaceId}/${firstPageId}`);
  }

  // No pages yet - show placeholder
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold mb-2">Chưa có trang nào</h2>
        <p className="text-muted-foreground mb-4">
          Tạo trang đầu tiên để bắt đầu xây nội dung cho không gian này.
        </p>
        <Link href={`/admin/spaces/${spaceId}/pages/new`} className="btn-primary">
          Tạo trang đầu tiên
        </Link>
      </div>
    </div>
  );
}
