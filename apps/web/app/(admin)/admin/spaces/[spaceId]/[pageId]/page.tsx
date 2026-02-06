import { EditorShell } from "@/components/editor/EditorShell";
import { getServerAccessToken } from "@/lib/auth/supabase-server";
import { serverApiGet } from "@/lib/api/server";
import type { ApiResponse, Page } from "@/lib/api/types";

async function getPage(pageId: string, token: string): Promise<Page | null> {
  try {
    const res = await serverApiGet<ApiResponse<Page>>(`/api/pages/${pageId}`, token);
    return res.data;
  } catch {
    return null;
  }
}

export default async function PageEditor({
  params,
}: {
  params: Promise<{ spaceId: string; pageId: string }>;
}) {
  const { spaceId, pageId } = await params;
  const token = await getServerAccessToken();

  const page = await getPage(pageId, token);

  if (!page) {
    return (
      <div className="p-8">
        <p>Trang không tồn tại</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <EditorShell
        pageId={pageId}
        spaceId={spaceId}
        spaceSlug={page.space_id}
        initialTitle={page.title}
        initialContent={page.version?.content_md ?? ""}
        initialStatus={page.status}
        updatedAt={page.updated_at}
      />
    </div>
  );
}
