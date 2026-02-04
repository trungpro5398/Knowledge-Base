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
import type { Space } from "@/lib/api/types";
import { slugToPath } from "@/lib/routing/slug";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface RenderData {
  page: { id: string; title: string; path: string; status: string };
  version: { content_md: string | null; rendered_html: string | null; toc: { id: string; text: string; level: number }[] };
  tree: TreeNode[];
  breadcrumb: { title: string; path: string }[];
}

type StartLink = { label: string; path: string };

function findNodeBySlugOrTitle(
  nodes: TreeNode[],
  predicate: (node: TreeNode) => boolean,
  parentPath: string[] = []
): { node: TreeNode; path: string[] } | null {
  for (const node of nodes) {
    const currentPath = [...parentPath, node.slug];
    if (predicate(node)) return { node, path: currentPath };
    if (node.children && node.children.length > 0) {
      const found = findNodeBySlugOrTitle(node.children, predicate, currentPath);
      if (found) return found;
    }
  }
  return null;
}

function getStartLinks(tree: TreeNode[]): StartLink[] {
  const match = findNodeBySlugOrTitle(
    tree,
    (node) =>
      node.slug.toLowerCase() === "getting-started" ||
      node.title.toLowerCase() === "getting started"
  );

  if (match && (match.node.children?.length ?? 0) > 0) {
    return (match.node.children ?? []).slice(0, 5).map((child) => ({
      label: child.title,
      path: [...match.path, child.slug].join("/"),
    }));
  }

  return tree.slice(0, 5).map((node) => ({
    label: node.title,
    path: [node.slug].join("/"),
  }));
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

async function getPublicSpaces(): Promise<Space[]> {
  const res = await fetch(`${API_URL}/api/spaces/public`, { next: { tags: ["kb"] } });
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
    const [tree, spaces] = await Promise.all([
      getTreeOnly(spaceSlug),
      getPublicSpaces(),
    ]);
    const startLinks = getStartLinks(tree);
    return (
      <div className="flex gap-6 py-4 md:py-8">
        <aside className="hidden md:block w-60 shrink-0">
          <nav className="sticky top-8 space-y-4">
            {spaces.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Spaces
                </p>
                <div className="space-y-1">
                  {spaces.map((space) => (
                    <Link
                      key={space.id}
                      href={`/kb/${space.slug}`}
                      className={`flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60 ${
                        space.slug === spaceSlug ? "bg-primary/10 text-primary" : ""
                      }`}
                    >
                      <span className="font-medium truncate">{space.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        /kb/{space.slug}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <PageTree
              spaceId=""
              spaceSlug={spaceSlug}
              nodes={tree}
              showEditLink={false}
            />
          </nav>
        </aside>
        <main id="main-content" className="min-w-0 flex-1 px-4 md:px-0">
          <div className="container max-w-4xl py-4 md:py-8">
            {spaceSlug === "tet-prosys" && startLinks.length > 0 && (
              <ReadThisFirst spaceSlug={spaceSlug} items={startLinks} />
            )}
            
            {!spaceSlug.includes("tet-prosys") && (
              <div className="text-center py-20 sm:py-32">
                <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 mb-6">
                  <svg className="h-10 w-10 sm:h-12 sm:w-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                  Chào mừng đến Kho Tài Liệu
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-md mx-auto">
                  Chọn một tài liệu từ danh mục bên trái để bắt đầu đọc
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-lg text-sm text-muted-foreground">
                  <span>💡</span>
                  <span className="hidden sm:inline">Sử dụng menu bên trái để điều hướng</span>
                  <span className="sm:hidden">Mở menu ở góc dưới để điều hướng</span>
                </div>
              </div>
            )}
          </div>
        </main>
        <MobileSidebar
          spaceId=""
          spaceSlug={spaceSlug}
          nodes={tree}
          showEditLink={false}
          spaces={spaces}
        />
      </div>
    );
  }

  const pathParts = segments.slice(1);
  const path = slugToPath(pathParts);
  const [data, spaces] = await Promise.all([
    getRenderData(spaceSlug, path),
    getPublicSpaces(),
  ]);

  if (!data) notFound();

  const { page, version, tree, breadcrumb } = data;
  const useRenderedHtml = !!version.rendered_html;
  return (
    <div className="flex gap-6 py-4 md:py-8">
      <aside className="hidden md:block w-60 shrink-0">
        <nav className="sticky top-8 space-y-4">
          {spaces.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Spaces
              </p>
              <div className="space-y-1">
                {spaces.map((space) => (
                  <Link
                    key={space.id}
                    href={`/kb/${space.slug}`}
                    className={`flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60 ${
                      space.slug === spaceSlug ? "bg-primary/10 text-primary" : ""
                    }`}
                  >
                    <span className="font-medium truncate">{space.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      /kb/{space.slug}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <PageTree
            spaceId=""
            spaceSlug={spaceSlug}
            nodes={tree}
            showEditLink={false}
          />
        </nav>
      </aside>
      <main id="main-content" className="min-w-0 flex-1 px-4 md:px-0">
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
        spaces={spaces}
      />
    </div>
  );
}
