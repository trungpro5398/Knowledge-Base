import { EditorShell } from "@/components/editor/EditorShell";
import { createServerSupabaseClient } from "@/lib/auth/supabase-server";
import { apiClient } from "@/lib/api/client";
import type { ApiResponse, Page } from "@/lib/api/types";

async function getPage(pageId: string, token: string): Promise<Page | null> {
  try {
    const res = await apiClient<ApiResponse<Page>>(`/api/pages/${pageId}`, { token });
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

  const page = await getPage(pageId, token);
  if (!page) return <div>Page not found</div>;

  return (
    <div className="p-8">
      <EditorShell
        pageId={pageId}
        spaceId={spaceId}
        initialTitle={page.title}
        initialContent={page.version?.content_md ?? ""}
        initialStatus={page.status}
      />
    </div>
  );
}
