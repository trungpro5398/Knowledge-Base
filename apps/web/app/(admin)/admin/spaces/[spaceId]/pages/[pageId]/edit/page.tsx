import { EditorShell } from "@/components/editor/EditorShell";
import { createServerSupabaseClient } from "@/lib/auth/supabase-server";
import { apiClient } from "@/lib/api/client";
import { AdminBreadcrumbs } from "@/components/admin/AdminBreadcrumbs";
import { FolderOpen, FileText } from "lucide-react";
import type { ApiResponse, Page, Space } from "@/lib/api/types";

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

export default async function EditPage({
  params,
}: {
  params: Promise<{ spaceId: string; pageId: string }>;
}) {
  const { spaceId, pageId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";

  const [page, space] = await Promise.all([
    getPage(pageId, token),
    getSpace(spaceId, token),
  ]);

  if (!page) return <div className="p-8">Page not found</div>;

  return (
    <div className="p-8">
      <AdminBreadcrumbs
        items={[
          {
            label: space?.name || "Space",
            href: `/admin/spaces/${spaceId}/tree`,
            icon: <FolderOpen className="h-4 w-4" />
          },
          {
            label: page.title,
            icon: <FileText className="h-4 w-4" />
          }
        ]}
      />
      <EditorShell
        pageId={pageId}
        spaceId={spaceId}
        spaceSlug={space?.slug || ""}
        initialTitle={page.title}
        initialContent={page.version?.content_md ?? ""}
        initialStatus={page.status}
        updatedAt={page.updated_at}
      />
    </div>
  );
}

