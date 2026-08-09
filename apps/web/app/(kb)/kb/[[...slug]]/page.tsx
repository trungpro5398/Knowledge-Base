import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PageRenderer } from "@/components/kb/PageRenderer";
import { Breadcrumbs } from "@/components/kb/Breadcrumbs";
import { Toc } from "@/components/kb/Toc";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { KbSidebarContent } from "@/components/kb/KbSidebarContent";
import { KbWelcomeEmpty } from "@/components/kb/KbWelcomeEmpty";
import { KbNewToProSysLink } from "@/components/kb/KbNewToProSysLink";
import { MobileSidebar } from "@/components/kb/mobile-sidebar";
import { ReadThisFirst } from "@/components/kb/ReadThisFirst";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { KbContextHeader } from "@/components/kb/KbContextHeader";
import { PageNavigation } from "@/components/kb/PageNavigation";
import { PageStatusBadge } from "@/components/kb/PageStatusBadge";
import { KbUnavailable } from "@/components/kb/KbUnavailable";
import { PublicLibraryDirectory } from "@/components/kb/PublicLibraryDirectory";
import type { TreeNode } from "@/components/kb/PageTree";
import type { Space } from "@/lib/api/types";
import { slugToPath } from "@/lib/routing/slug";
import { extractMarkdownToc } from "@/lib/kb/headings";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface RenderData {
  page: { id: string; title: string; path: string; status: string };
  version: { content_md: string | null; rendered_html: string | null; toc: { id: string; text: string; level: number }[] };
  tree: TreeNode[];
  breadcrumb: { title: string; path: string }[];
  space: { name: string; organization_name?: string | null };
}

type StartLink = { label: string; path: string };
type KbPageProps = { params: Promise<{ slug?: string[] }> };

class PublicApiError extends Error {}

async function fetchPublic(input: string): Promise<Response> {
  try {
    return await fetch(input, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new PublicApiError("Public API request failed");
  }
}

async function readPublicJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new PublicApiError("Public API returned an invalid response");
  }
}

function getPageDescription(content: string | null, fallback: string): string {
  if (!content) return fallback;
  const plainText = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_>#~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plainText) return fallback;
  return plainText.length > 160 ? `${plainText.slice(0, 157).trimEnd()}…` : plainText;
}

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

const getRenderData = cache(async (spaceSlug: string, path: string): Promise<RenderData | null> => {
  const res = await fetchPublic(
    `${API_URL}/api/public/render?spaceSlug=${encodeURIComponent(spaceSlug)}&path=${encodeURIComponent(path)}`
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new PublicApiError(`Public render API failed with status ${res.status}`);
  const json = await readPublicJson(res) as { data?: RenderData };
  if (!json.data) throw new PublicApiError("Public render API returned no data");
  return json.data;
});

const getTreeOnly = cache(async (spaceSlug: string): Promise<TreeNode[] | null> => {
  const res = await fetchPublic(
    `${API_URL}/api/spaces/by-slug/${encodeURIComponent(spaceSlug)}/pages/tree`
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new PublicApiError(`Public tree API failed with status ${res.status}`);
  const json = await readPublicJson(res) as { data?: TreeNode[] };
  return json.data ?? [];
});

const getPublicSpaces = cache(async (): Promise<Space[]> => {
  const res = await fetchPublic(`${API_URL}/api/spaces/public`);
  if (!res.ok) throw new PublicApiError(`Public spaces API failed with status ${res.status}`);
  const json = await readPublicJson(res) as { data?: Space[] };
  return json.data ?? [];
});

export async function generateMetadata({ params }: KbPageProps): Promise<Metadata> {
  const { slug } = await params;
  const segments = slug ?? [];
  if (segments.length === 0) {
    return { title: "Kho Tài Liệu TET" };
  }

  if (segments.length === 1) {
    const fallbackName = segments[0]!;
    let name = fallbackName;
    try {
      const spaces = await getPublicSpaces();
      const space = spaces.find((item) => item.slug === fallbackName);
      if (!space) notFound();
      name = space.name;
    } catch (error) {
      if (!(error instanceof PublicApiError)) throw error;
    }
    return {
      title: `${name} | Kho Tài Liệu TET`,
      description: `Tài liệu đã xuất bản trong ${name}.`,
    };
  }

  const spaceSlug = segments[0]!;
  let data: RenderData | null = null;
  try {
    data = await getRenderData(spaceSlug, slugToPath(segments.slice(1)));
  } catch (error) {
    if (!(error instanceof PublicApiError)) throw error;
    const fallbackTitle = segments.at(-1)!.replace(/-/g, " ");
    return { title: `${fallbackTitle} | Kho Tài Liệu TET` };
  }
  if (!data) notFound();
  const title = `${data.page.title} | ${data.space.name}`;
  const description = getPageDescription(
    data.version.content_md,
    `Tài liệu ${data.page.title} trong ${data.space.name}.`
  );
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary", title, description },
  };
}

async function renderKbPage({ params }: KbPageProps) {
  const { slug } = await params;
  const segments = slug ?? [];

  if (segments.length === 0) {
    const publicSpaces = await getPublicSpaces();
    return <PublicLibraryDirectory spaces={publicSpaces} />;
  }

  const spaceSlug = segments[0]!;

  if (segments.length < 2) {
    const [tree, spaces] = await Promise.all([
      getTreeOnly(spaceSlug),
      getPublicSpaces(),
    ]);
    if (!tree) notFound();
    const startLinks = getStartLinks(tree);
    const currentSpace = spaces.find((space) => space.slug === spaceSlug);
    return (
      <>
        <div className="flex gap-6 py-4 md:py-8">
        <CollapsibleSidebar storageKey="kb" resizable responsive="hidden md:flex">
          <KbSidebarContent spaces={spaces} spaceSlug={spaceSlug} tree={tree} />
        </CollapsibleSidebar>
        <main id="main-content" className="min-w-0 flex-1 px-4 md:px-0 animate-fade-in">
          <div className="container max-w-4xl py-4 md:py-8">
            <KbContextHeader
              spaceName={currentSpace?.name || spaceSlug}
              organizationName={currentSpace?.organization_name}
            />
            <h1 className="mb-6 break-words text-balance text-2xl font-bold md:text-3xl">
              {currentSpace?.name || spaceSlug}
            </h1>
            {tree.length > 0 && startLinks.length > 0 ? (
              <ReadThisFirst
                spaceSlug={spaceSlug}
                spaceName={currentSpace?.name || spaceSlug}
                items={startLinks}
              />
            ) : null}
            
            {tree.length === 0 ? <KbWelcomeEmpty /> : null}
          </div>
        </main>
        <MobileSidebar
          spaceSlug={spaceSlug}
          nodes={tree}
          spaces={spaces}
        />
        </div>
      </>
    );
  }

  const pathParts = segments.slice(1);
  const path = slugToPath(pathParts);
  const [data, spaces] = await Promise.all([
    getRenderData(spaceSlug, path),
    getPublicSpaces(),
  ]);

  if (!data) notFound();

  const { page, version, breadcrumb, space } = data;
  const tree = data.tree;
  const apiToc = version.toc
    .filter((item) => item.level >= 2)
    .map((item) => ({
      ...item,
      id: item.id.startsWith("user-content-") ? item.id : `user-content-${item.id}`,
    }));
  const toc = apiToc.length > 0
    ? apiToc
    : extractMarkdownToc(version.content_md ?? "");
  const useRenderedHtml = !!version.rendered_html;
  return (
    <>
      <div className="flex gap-6 py-4 md:py-8">
      <CollapsibleSidebar storageKey="kb" resizable responsive="hidden md:flex">
        <KbSidebarContent spaces={spaces} spaceSlug={spaceSlug} tree={tree} />
      </CollapsibleSidebar>
      <main id="main-content" className="min-w-0 flex-1 px-4 md:px-0 animate-fade-in">
        <div className="container max-w-6xl py-4 md:py-8">
          <KbContextHeader
            spaceName={space.name}
            organizationName={space.organization_name}
          />
          {spaceSlug === "tet-prosys" ? <KbNewToProSysLink spaceSlug={spaceSlug} /> : null}
          <Breadcrumbs
            spaceSlug={spaceSlug}
            path={path}
            title={page.title}
            spaceName={space.name}
            items={breadcrumb}
            sticky
          />
          <header className="mb-6 flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 flex-1 break-words text-balance text-2xl font-bold md:text-3xl">
              {page.title}
            </h1>
            <PageStatusBadge status={page.status} />
            <CopyLinkButton />
          </header>
          <div className={toc.length > 0 ? "grid xl:grid-cols-[minmax(0,1fr)_13rem] xl:gap-10" : ""}>
            {toc.length > 0 ? (
              <aside className="order-first min-w-0 xl:order-none xl:col-start-2 xl:row-start-1">
                <div className="xl:sticky xl:top-28 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto xl:overscroll-contain">
                  <Toc items={toc} responsive />
                </div>
              </aside>
            ) : null}
            <div className="min-w-0 xl:col-start-1 xl:row-start-1">
              <article className="prose-kb max-w-none">
                <PageRenderer
                  html={useRenderedHtml ? version.rendered_html! : undefined}
                  content={useRenderedHtml ? undefined : version.content_md ?? ""}
                  pageTitle={page.title}
                />
              </article>
              <PageNavigation spaceSlug={spaceSlug} tree={tree} currentPath={page.path} />
            </div>
          </div>
        </div>
      </main>
      <MobileSidebar
        spaceSlug={spaceSlug}
        nodes={tree}
        spaces={spaces}
      />
      </div>
    </>
  );
}

export default async function KbPage(props: KbPageProps) {
  try {
    return await renderKbPage(props);
  } catch (error) {
    if (error instanceof PublicApiError) return <KbUnavailable />;
    throw error;
  }
}
