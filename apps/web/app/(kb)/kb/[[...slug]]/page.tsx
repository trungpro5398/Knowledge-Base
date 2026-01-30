import { notFound } from "next/navigation";
import { PageRenderer } from "@/components/kb/PageRenderer";
import { Breadcrumbs } from "@/components/kb/Breadcrumbs";
import { Toc } from "@/components/kb/Toc";
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

export default async function KbPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  if (!slug || slug.length < 2) {
    const [spaceSlug] = slug || [];
    if (spaceSlug) {
      return (
        <div className="container max-w-4xl py-8">
          <h1 className="text-2xl font-bold">Space: {spaceSlug}</h1>
          <p className="text-muted-foreground">Select a page from the sidebar.</p>
        </div>
      );
    }
    return notFound();
  }

  const [spaceSlug, ...pathParts] = slug;
  const path = slugToPath(pathParts);
  const page = await getPage(spaceSlug!, path);

  if (!page) notFound();

  const content = page.version?.content_md || "";
  const headings = content.match(/^#{1,3}\s+.+$/gm) || [];

  return (
    <div className="container max-w-4xl py-8">
      <Breadcrumbs spaceSlug={spaceSlug!} path={path} title={page.title} />
      <article className="prose dark:prose-invert max-w-none">
        <h1>{page.title}</h1>
        <PageRenderer content={content} />
      </article>
      {headings.length > 1 && (
        <aside className="mt-12">
          <Toc headings={headings} />
        </aside>
      )}
    </div>
  );
}
