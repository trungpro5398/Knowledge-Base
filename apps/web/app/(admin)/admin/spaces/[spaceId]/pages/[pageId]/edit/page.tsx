import { EditorShell } from "@/components/editor/EditorShell";
import { createServerSupabaseClient } from "@/lib/auth/supabase-server";
import { apiClient } from "@/lib/api/client";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { PageTree, type TreeNode } from "@/components/kb/PageTree";
import type { ApiResponse, Page, Space, PageNode } from "@/lib/api/types";

async function getPage(pageId: string, token: string): Promise<Page | null> {
  try {
    const res = await apiClient<ApiResponse<Page>>(`/api/pages/${pageId}`, { token });
    return res.data;
  } catch {
    return null;
  }
}

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
    const res = await apiClient<ApiResponse<PageNode[]>>(
      `/api/spaces/${spaceId}/pages/tree`,
      { token }
    );
    return res.data as TreeNode[];
  } catch {
    return [];
  }
}

export default async function EditPage({
  params,
}: {
  params: Promise<{ spaceId: string; pageId: string }>;
}) {
  const { spaceId, pageId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";

  const [page, space, tree] = await Promise.all([
    getPage(pageId, token),
    getSpace(spaceId, token),
    getTree(spaceId, token),
  ]);

  if (!page) return <div className="p-8">Page not found</div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 flex gap-6">
      {/* Sidebar: page tree for this space */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-4 space-y-4">
          <AdminBreadcrumbs
            items={[
              {
                label: space?.name || "Space",
                href: `/admin/spaces/${spaceId}/tree`,
                iconName: "folder",
              },
            ]}
          />
          <div className="card">
            <PageTree
              spaceId={spaceId}
              spaceSlug={space?.slug || ""}
              nodes={tree}
              linkMode="admin"
              showEditLink={false}
            />
          </div>
        </div>
      </aside>

      {/* Main editor pane */}
      <main className="flex-1 min-w-0">
        <div className="mb-4 lg:hidden">
          <AdminBreadcrumbs
            items={[
              {
                label: space?.name || "Space",
                href: `/admin/spaces/${spaceId}/tree`,
                iconName: "folder",
              },
              {
                label: page.title,
                iconName: "file",
              },
            ]}
          />
        </div>

        <EditorShell
          pageId={pageId}
          spaceId={spaceId}
          spaceSlug={space?.slug || ""}
          initialTitle={page.title}
          initialContent={page.version?.content_md ?? ""}
          initialStatus={page.status}
          updatedAt={page.updated_at}
        />
      </main>
    </div>
  );
}

