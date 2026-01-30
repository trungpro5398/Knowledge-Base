import Link from "next/link";
import { PageTree } from "@/components/kb/PageTree";
import type { TreeNode } from "@/components/kb/PageTree";
import { createServerSupabaseClient } from "@/lib/auth/supabase-server";
import { apiClient } from "@/lib/api/client";

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

  if (!space) return <div>Space not found</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{space.name}</h1>
        <Link
          href={`/admin/spaces/${spaceId}/pages/new`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
        >
          New page
        </Link>
      </div>
      <PageTree
        spaceId={spaceId}
        spaceSlug={space.slug}
        nodes={tree}
      />
    </div>
  );
}
