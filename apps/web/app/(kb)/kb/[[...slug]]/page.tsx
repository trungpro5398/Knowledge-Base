import Link from "next/link";
import { notFound } from "next/navigation";
import { PageRenderer } from "@/components/kb/PageRenderer";
import { Breadcrumbs } from "@/components/kb/Breadcrumbs";
import { Toc } from "@/components/kb/Toc";
import { PageTree } from "@/components/kb/PageTree";
import { MobileSidebar } from "@/components/kb/mobile-sidebar";
import { ReadThisFirst } from "@/components/kb/ReadThisFirst";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import type { TreeNode } from "@/components/kb/PageTree";
import { slugToPath } from "@/lib/routing/slug";
import { TET_PROSYS_GROUPS } from "@/lib/kb/sidebar-groups";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface RenderData {
  page: { id: string; title: string; path: string; status: string };
  version: { content_md: string | null; rendered_html: string | null; toc: { id: string; text: string; level: number }[] };
  tree: TreeNode[];
  breadcrumb: { title: string; path: string }[];
}

async function getRenderData(spaceSlug: string, path: string): Promise<RenderData | null> {
  const res = await fetch(
    `${API_URL}/api/public/render?spaceSlug=${encodeURIComponent(spaceSlug)}&path=${encodeURIComponent(path)}`,
    { next: { tags: ["kb"] } }
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data;
}

async function getTreeOnly(spaceSlug: string): Promise<TreeNode[]> {
  const res = await fetch(
    `${API_URL}/api/spaces/by-slug/${spaceSlug}/pages/tree`,
    { next: { tags: ["kb"] } }
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

  if (segments.length === 0) {
    const { redirect } = await import("next/navigation");
    redirect(`/kb/${DEFAULT_SPACE_SLUG}`);
  }

  const spaceSlug = segments[0]!;

  if (segments.length < 2) {
    const tree = await getTreeOnly(spaceSlug);
    const useGroupedSidebar = spaceSlug === "tet-prosys";
    return (
      <div className="flex gap-6 py-4 md:py-8">
        <aside className="hidden md:block w-56 shrink-0">
          <nav className="sticky top-8">
            <PageTree
              spaceId=""
              spaceSlug={spaceSlug}
              nodes={tree}
              showEditLink={false}
              groupConfig={useGroupedSidebar ? TET_PROSYS_GROUPS : undefined}
            />
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 md:px-0">
          <div className="container max-w-4xl py-4 md:py-8">
            {spaceSlug === "tet-prosys" && <ReadThisFirst spaceSlug={spaceSlug} />}
            <h1 className="text-xl md:text-2xl font-bold">Space: {spaceSlug}</h1>
            <p className="text-muted-foreground">Select a page from the sidebar.</p>
          </div>
        </main>
        <MobileSidebar
          spaceId=""
          spaceSlug={spaceSlug}
          nodes={tree}
          showEditLink={false}
          groupConfig={useGroupedSidebar ? TET_PROSYS_GROUPS : undefined}
        />
      </div>
    );
  }

  const pathParts = segments.slice(1);
  const path = slugToPath(pathParts);
  const data = await getRenderData(spaceSlug, path);

  if (!data) notFound();

  const { page, version, tree, breadcrumb } = data;
  const useRenderedHtml = !!version.rendered_html;
  const useGroupedSidebar = spaceSlug === "tet-prosys";

  return (
    <div className="flex gap-6 py-4 md:py-8">
      <aside className="hidden md:block w-56 shrink-0">
        <nav className="sticky top-8">
          <PageTree
            spaceId=""
            spaceSlug={spaceSlug}
            nodes={tree}
            showEditLink={false}
            groupConfig={useGroupedSidebar ? TET_PROSYS_GROUPS : undefined}
          />
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 md:px-0">
        <div className="container max-w-4xl py-4 md:py-8">
          {spaceSlug === "tet-prosys" && (
            <p className="text-sm text-muted-foreground mb-3">
              <Link href={`/kb/${spaceSlug}`} className="hover:text-foreground underline">
                New to ProSys? Start here →
              </Link>
            </p>
          )}
          <Breadcrumbs spaceSlug={spaceSlug} path={path} title={page.title} items={breadcrumb} />
          <article className="prose-kb max-w-none">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <h1 className="text-2xl md:text-3xl font-bold">{page.title}</h1>
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                  page.status === "published"
                    ? "bg-primary/15 text-primary"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                }`}
              >
                {page.status === "published" ? "OFFICIAL" : "DRAFT"}
              </span>
              <CopyLinkButton />
            </div>
            <div className="prose-kb">
              <PageRenderer
                html={useRenderedHtml ? version.rendered_html! : undefined}
                content={useRenderedHtml ? undefined : version.content_md ?? ""}
              />
            </div>
          </article>
          {version.toc.length > 1 && (
            <aside className="mt-12">
              <Toc items={version.toc} />
            </aside>
          )}
        </div>
      </main>
      <MobileSidebar
        spaceId=""
        spaceSlug={spaceSlug}
        nodes={tree}
        showEditLink={false}
        groupConfig={useGroupedSidebar ? TET_PROSYS_GROUPS : undefined}
      />
    </div>
  );
}
