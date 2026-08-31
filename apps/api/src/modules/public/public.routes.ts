import { FastifyInstance } from "fastify";
import * as spacesService from "../spaces/spaces.service.js";
import * as attachmentsRepo from "../attachments/attachments.repo.js";
import { createClient } from "@supabase/supabase-js";
import { config } from "../../config/env.js";
import { supabaseFetchWithTimeout } from "../../db/pool.js";
import {
  getPublicAttachmentUrlCached,
  getPublishedPageByPathCached,
  getPublishedTreeCached,
  searchPublicCached,
} from "./public-cache.js";
import { isValidPublicSpaceSlug, parsePublicSearchPage } from "./public-query.js";

const PUBLIC_READ_RATE_LIMIT = { max: 120, timeWindow: "1 minute" };

function hasSearchTerms(query: string): boolean {
  return query.replace(/[^\p{L}\p{N}]/gu, "").length >= 2;
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

export async function publicRoutes(fastify: FastifyInstance) {
  const supabase = createClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey || config.supabaseAnonKey,
    { global: { fetch: supabaseFetchWithTimeout } }
  );

  fastify.get("/attachments", { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } }, async (request, reply) => {
    const path = (request.query as { path?: string }).path;
    if (!path || path.length > 160 || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}-[a-zA-Z0-9.-]+$/.test(path)) {
      return reply.status(400).send({ status: "error", message: "Invalid attachment path" });
    }

    let signedUrl: string | null;
    try {
      signedUrl = await getPublicAttachmentUrlCached(
        path,
        () => attachmentsRepo.getPublishedFilePath(path),
        async (authorizedPath) => {
          const { data, error } = await supabase.storage
            .from("attachments")
            .createSignedUrl(authorizedPath, 300);
          if (error || !data?.signedUrl) throw error ?? new Error("Missing signed URL");
          return data.signedUrl;
        }
      );
    } catch (error) {
      request.log.error(error, "Failed to create public attachment URL");
      return reply.status(500).send({ status: "error", message: "Attachment unavailable" });
    }
    if (!signedUrl) {
      return reply.status(404).send({ status: "error", message: "Attachment not found" });
    }

    reply.header("Cache-Control", "no-store");
    return reply.redirect(signedUrl, 302);
  });

  fastify.get("/search", { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (request, reply) => {
    const query = request.query as { q?: string; spaceSlug?: string; limit?: string; page?: string };
    const q = query.q?.trim().slice(0, 200) ?? "";
    if (q.length < 2 || !hasSearchTerms(q)) {
      return { data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } };
    }
    if (query.spaceSlug !== undefined && !isValidPublicSpaceSlug(query.spaceSlug)) {
      return reply.status(400).send({ status: "error", message: "Invalid space slug" });
    }

    const page = parsePublicSearchPage(query.page);
    const limit = Math.min(20, Math.max(1, Number.parseInt(query.limit ?? "10", 10) || 10));
    const { results, total } = await searchPublicCached({
      q,
      spaceSlug: query.spaceSlug,
      limit,
      offset: (page - 1) * limit,
    });

    reply.header("Cache-Control", "no-store");
    return {
      data: results,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  });

  fastify.get("/render", { config: { rateLimit: PUBLIC_READ_RATE_LIMIT } }, async (request, reply) => {
    const spaceSlug = (request.query as { spaceSlug?: string }).spaceSlug;
    const path = (request.query as { path?: string }).path;

    if (!isValidPublicSpaceSlug(spaceSlug) || !path || path.length > 1_000) {
      return reply.status(400).send({
        status: "error",
        message: "spaceSlug and path query params required",
      });
    }

    const space = await spacesService.getSpaceBySlug(spaceSlug);
    if (!space) {
      return reply.status(404).send({ status: "error", message: "Space not found" });
    }

    const pagePromise = getPublishedPageByPathCached(space.id, path);
    // A conditional hit skips navigation/library data. Normal page reads
    // combine all public data into one API response and load it in parallel,
    // avoiding a second web-to-API serverless invocation for the sidebar.
    const supportingDataPromise = request.headers["if-none-match"]
      ? null
      : Promise.all([
          getPublishedTreeCached(space.id),
          spacesService.listPublicSpaces(),
        ]);
    // If the page returns 404 or fails first, keep this parallel request
    // handled without changing the original promise awaited below.
    supportingDataPromise?.catch(() => undefined);
    const page = await pagePromise;
    if (!page) {
      return reply.status(404).send({ status: "error", message: "Page not found" });
    }

    const etag = `"${page.id}:${page.published_version_id ?? "none"}:${new Date(page.updated_at).getTime()}"`;
    const ifNoneMatch = request.headers["if-none-match"];
    if (ifNoneMatch === etag || ifNoneMatch === `W/${etag}`) {
      reply.header("ETag", etag);
      reply.header("Cache-Control", "no-store");
      return reply.status(304).send();
    }

    const [{ tree, pageTitleByPath }, publicSpaces] = await (
      supportingDataPromise ?? Promise.all([
        getPublishedTreeCached(space.id),
        spacesService.listPublicSpaces(),
      ])
    );
    const breadcrumb = buildBreadcrumb(spaceSlug, path, page.title, pageTitleByPath);
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
      space: {
        name: space.name,
        organization_name: space.organization_name ?? null,
      },
      spaces: publicSpaces,
    };

    reply.header("ETag", etag);
    reply.header("Cache-Control", "no-store");
    return { data };
  });
}
