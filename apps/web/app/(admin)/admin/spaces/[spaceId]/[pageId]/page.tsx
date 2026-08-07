import { EditorShell } from "@/components/editor/EditorShell";
import { getServerAccessToken } from "@/lib/auth/supabase-server";
import { serverApiGet } from "@/lib/api/server";
import type { ApiResponse, Page, Space } from "@/lib/api/types";

async function getPage(pageId: string, token: string): Promise<Page | null> {
  try {
    const res = await serverApiGet<ApiResponse<Page>>(`/api/pages/${pageId}`, token);
    return res.data;
  } catch {
    return null;
  }
}

async function getSpace(spaceId: string, token: string): Promise<Space | null> {
  try {
    const res = await serverApiGet<ApiResponse<Space>>(`/api/spaces/${spaceId}`, token);
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

  const [page, space] = await Promise.all([
    getPage(pageId, token),
    getSpace(spaceId, token),
  ]);

  if (!page || !space) {
    return (
      <div className="p-8">
        <p>Tài liệu không tồn tại</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <EditorShell
        pageId={pageId}
        spaceId={spaceId}
        spaceSlug={space.slug}
        pagePath={page.path}
        initialTitle={page.title}
        initialContent={page.version?.content_md ?? ""}
        initialStatus={page.status}
        updatedAt={page.updated_at}
      />
    </div>
  );
}
