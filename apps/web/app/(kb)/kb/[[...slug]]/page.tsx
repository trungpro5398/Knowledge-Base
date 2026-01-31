import { notFound } from "next/navigation";
import { PageRenderer } from "@/components/kb/PageRenderer";
import { Breadcrumbs } from "@/components/kb/Breadcrumbs";
import { Toc } from "@/components/kb/Toc";
import { PageTree } from "@/components/kb/PageTree";
import type { TreeNode } from "@/components/kb/PageTree";
import { slugToPath } from "@/lib/routing/slug";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function getPage(spaceSlug: string, path: string) {
  const res = await fetch(
    `${API_URL}/api/spaces/by-slug/${spaceSlug}/pages/by-path?path=${encodeURIComponent(path)}`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

async function getTree(spaceSlug: string): Promise<TreeNode[]> {
  const res = await fetch(
    `${API_URL}/api/spaces/by-slug/${spaceSlug}/pages/tree`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

const DEFAULT_SPACE_SLUG = "tet-prosys";

export default async function KbPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const segments = slug ?? [];

  // /kb with no path → redirect to default space so /kb always resolves
  if (segments.length === 0) {
    const { redirect } = await import("next/navigation");
    redirect(`/kb/${DEFAULT_SPACE_SLUG}`);
  }

  const spaceSlug = segments[0]!;
  const tree = await getTree(spaceSlug);

  if (segments.length < 2) {
    return (
      <div className="flex gap-6 py-8">
        <aside className="w-56 shrink-0">
          <nav className="sticky top-8">
            <PageTree spaceId="" spaceSlug={spaceSlug} nodes={tree} showEditLink={false} />
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="container max-w-4xl py-8">
            <h1 className="text-2xl font-bold">Space: {spaceSlug}</h1>
            <p className="text-muted-foreground">Select a page from the sidebar.</p>
          </div>
        </main>
      </div>
    );
  }

  const pathParts = segments.slice(1);
  const path = slugToPath(pathParts);
  const page = await getPage(spaceSlug, path);

  if (!page) notFound();

  const content = page.version?.content_md || "";
  const headings = content.match(/^#{1,3}\s+.+$/gm) || [];

  return (
    <div className="flex gap-6 py-8">
      <aside className="w-56 shrink-0">
        <nav className="sticky top-8">
          <PageTree spaceId="" spaceSlug={spaceSlug} nodes={tree} showEditLink={false} />
        </nav>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="container max-w-4xl py-8">
          <Breadcrumbs spaceSlug={spaceSlug} path={path} title={page.title} />
          <article className="prose-kb max-w-none">
            <h1 className="text-3xl font-bold mb-6">{page.title}</h1>
            <div className="prose-kb">
              <PageRenderer content={content} />
            </div>
          </article>
          {headings.length > 1 && (
            <aside className="mt-12">
              <Toc headings={headings} />
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
