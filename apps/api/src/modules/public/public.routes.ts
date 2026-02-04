import { FastifyInstance } from "fastify";
import * as spacesService from "../spaces/spaces.service.js";
import * as pagesService from "../pages/pages.service.js";

interface PageRow {
  id: string;
  path: string;
  title: string;
  [key: string]: unknown;
}

function buildBreadcrumb(
  spaceSlug: string,
  path: string,
  pageTitle: string,
  pageTitleByPath: Map<string, string>
): { title: string; path: string }[] {
  const parts = path.split(".").filter(Boolean);
  const crumbs: { title: string; path: string }[] = [
    { title: "KB", path: "" },
    { title: spaceSlug, path: spaceSlug },
  ];
  let acc = "";
  for (let i = 0; i < parts.length; i++) {
    acc += (acc ? "." : "") + parts[i];
    crumbs.push({ title: pageTitleByPath.get(acc) ?? parts[i], path: acc });
  }
  if (parts.length > 0 && crumbs[crumbs.length - 1]!.title !== pageTitle) {
    crumbs[crumbs.length - 1]!.title = pageTitle;
  }
  return crumbs;
}

function flattenTree(nodes: (PageRow & { children?: unknown[] })[], acc: { path: string; title: string }[] = []): { path: string; title: string }[] {
  for (const node of nodes) {
    acc.push({ path: node.path, title: node.title });
    if (node.children && (node.children as PageRow[]).length > 0) {
      flattenTree(node.children as (PageRow & { children?: unknown[] })[], acc);
    }
  }
  return acc;
}

export async function publicRoutes(fastify: FastifyInstance) {
  fastify.get("/render", async (request, reply) => {
    const spaceSlug = (request.query as { spaceSlug?: string }).spaceSlug;
    const path = (request.query as { path?: string }).path;

    if (!spaceSlug || !path) {
      return reply.status(400).send({
        status: "error",
        message: "spaceSlug and path query params required",
      });
    }

    const space = await spacesService.getSpaceBySlug(spaceSlug);
    if (!space) {
      return reply.status(404).send({ status: "error", message: "Space not found" });
    }

    const page = await import("../pages/pages.repo.js").then((m) =>
      m.getPageByPath(space.id, path)
    );
    if (!page) {
      return reply.status(404).send({ status: "error", message: "Page not found" });
    }

    const tree = await pagesService.getPagesTree(space.id, { publishedOnly: true });
    const flatPages = flattenTree(tree as unknown as (PageRow & { children?: unknown[] })[]);
    const pageTitleByPath = new Map(flatPages.map((item) => [item.path, item.title]));
    const breadcrumb = buildBreadcrumb(spaceSlug, path, page.title, pageTitleByPath);

    const etag = `"${page.id}:${page.current_version_id ?? "none"}"`;
    const ifNoneMatch = request.headers["if-none-match"];
    if (ifNoneMatch === etag || ifNoneMatch === `W/${etag}`) {
      reply.header("ETag", etag);
      reply.header("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=86400");
      return reply.status(304).send();
    }

    const version = page.version as { content_md?: string; rendered_html?: string; toc_json?: unknown[] } | undefined;
    const data = {
      page: { id: page.id, title: page.title, path: page.path, status: page.status },
      version: {
        content_md: version?.content_md ?? null,
        rendered_html: version?.rendered_html ?? null,
        toc: version?.toc_json ?? [],
      },
      tree,
      breadcrumb,
    };

    reply.header("ETag", etag);
    reply.header("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=86400");
    return { data };
  });
}
