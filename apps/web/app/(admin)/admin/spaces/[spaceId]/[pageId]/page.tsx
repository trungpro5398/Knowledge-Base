import { EditorShell } from "@/components/editor/EditorShell";
import { getServerAccessToken } from "@/lib/auth/supabase-server";
import { serverApiGet } from "@/lib/api/server";
import { getSpaceBootstrap } from "@/lib/api/space-bootstrap";
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

  const [page, space] = await Promise.all([
    getPage(pageId, token),
    getSpaceBootstrap(spaceId, token).then((bootstrap) => bootstrap?.space ?? null),
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
