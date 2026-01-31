import Link from "next/link";
import { PageTree } from "@/components/kb/PageTree";
import type { TreeNode } from "@/components/kb/PageTree";
import { createServerSupabaseClient } from "@/lib/auth/supabase-server";
import { apiClient } from "@/lib/api/client";
import { Plus } from "lucide-react";

async function getSpace(spaceId: string, token: string) {
  try {
    const res = await apiClient(`/api/spaces/${spaceId}`, { token });
    return res.data as { id: string; name: string; slug: string };
  } catch {
    return null;
  }
}

async function getTree(spaceId: string, token: string) {
  try {
    const res = await apiClient(`/api/spaces/${spaceId}/pages/tree`, { token });
    return res.data as TreeNode[];
  } catch {
    return [];
  }
}

export default async function TreePage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";

  const [space, tree] = await Promise.all([
    getSpace(spaceId, token),
    getTree(spaceId, token),
  ]);

  if (!space) return <div className="p-8">Space không tồn tại</div>;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">{space.name}</h1>
          <p className="text-muted-foreground text-sm font-mono mt-0.5">{space.slug}</p>
        </div>
        <Link
          href={`/admin/spaces/${spaceId}/pages/new`}
          className="btn-primary inline-flex items-center gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Trang mới
        </Link>
      </div>
      <div className="card">
        <PageTree spaceId={spaceId} spaceSlug={space.slug} nodes={tree} />
      </div>
    </div>
  );
}
