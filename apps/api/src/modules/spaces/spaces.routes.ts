import { FastifyInstance } from "fastify";
import type { AuthHandlers } from "../../routes/auth-types.js";
import * as spacesService from "./spaces.service.js";
import { getPublishedPageByPathCached, getPublishedTreeCached } from "../public/public-cache.js";
import { createSpaceSchema } from "@kb/shared";

export async function spacesRoutes(fastify: FastifyInstance, auth: AuthHandlers) {
  const { authenticate } = auth;

  fastify.get("/spaces", { preHandler: [authenticate] }, async (request) => {
    const userId = request.user!.id;
    const spaces = await spacesService.listSpaces(userId);
    return { data: spaces };
  });

  fastify.get("/spaces/stats", { preHandler: [authenticate] }, async (request) => {
    const userId = request.user!.id;
    const stats = await spacesService.getSpacesStats(userId);
    return { data: stats };
  });

  fastify.get("/spaces/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    const space = await spacesService.getSpace(id, userId);
    if (!space) {
      return reply.status(404).send({ status: "error", message: "Space not found" });
    }
    return { data: space };
  });

  // Public endpoints for published content
  fastify.get("/spaces/by-slug/:slug/pages/by-path", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const path = (request.query as { path?: string }).path;
    if (!path) {
      return reply.status(400).send({ status: "error", message: "path query required" });
    }
    const space = await spacesService.getSpaceBySlug(slug);
    if (!space) {
      return reply.status(404).send({ status: "error", message: "Space not found" });
    }
    const page = await getPublishedPageByPathCached(space.id, path);
    if (!page) {
      return reply.status(404).send({ status: "error", message: "Page not found" });
    }
    const etag = `"${page.id}:${page.current_version_id ?? "none"}"`;
    const ifNoneMatch = request.headers["if-none-match"];
    if (ifNoneMatch === etag || ifNoneMatch === `W/${etag}`) {
      reply.header("ETag", etag);
      reply.header("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=86400");
      return reply.status(304).send();
    }
    reply.header("ETag", etag);
    reply.header("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=86400");
    return { data: page };
  });

  fastify.get("/spaces/by-slug/:slug/pages/tree", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const space = await spacesService.getSpaceBySlug(slug);
    if (!space) {
      return reply.status(404).send({ status: "error", message: "Space not found" });
    }
    const { tree } = await getPublishedTreeCached(space.id);
    reply.header("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=86400");
    return { data: tree };
  });

  fastify.post("/spaces", { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = createSpaceSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        status: "error",
        message: "Validation failed",
        errors: parsed.error.errors,
      });
    }
    const userId = request.user!.id;
    const space = await spacesService.createSpace(parsed.data, userId);
    return reply.status(201).send({ data: space });
  });
}
