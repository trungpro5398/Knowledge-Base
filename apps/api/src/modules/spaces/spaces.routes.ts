import { FastifyInstance } from "fastify";
import type { AuthHandlers } from "../../routes/auth-types.js";
import * as spacesService from "./spaces.service.js";
import { getPublishedPageByPathCached, getPublishedTreeCached, toPublicPage } from "../public/public-cache.js";
import { isValidPublicSpaceSlug } from "../public/public-query.js";
import { createSpaceSchema, updateSpaceSchema } from "@kb/shared";

export async function spacesRoutes(fastify: FastifyInstance, auth: AuthHandlers) {
  const { authenticate } = auth;
  const publicReadRateLimit = { max: 120, timeWindow: "1 minute" };

  fastify.get("/spaces/public", { config: { rateLimit: publicReadRateLimit } }, async (_request, reply) => {
    const spaces = await spacesService.listPublicSpaces();
    reply.header("Cache-Control", "no-store");
    return { data: spaces };
  });

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

  fastify.get("/spaces/:id/bootstrap", { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const data = await spacesService.getSpaceBootstrap(id, request.user!.id);
    return { data };
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
  fastify.get("/spaces/by-slug/:slug/pages/by-path", { config: { rateLimit: publicReadRateLimit } }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const path = (request.query as { path?: string }).path;
    if (!isValidPublicSpaceSlug(slug) || !path || path.length > 1_000) {
      return reply.status(400).send({ status: "error", message: "Invalid public page request" });
    }
    const space = await spacesService.getSpaceBySlug(slug);
    if (!space) {
      return reply.status(404).send({ status: "error", message: "Space not found" });
    }
    const page = await getPublishedPageByPathCached(space.id, path);
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
    reply.header("ETag", etag);
    reply.header("Cache-Control", "no-store");
    return { data: toPublicPage(page) };
  });

  fastify.get("/spaces/by-slug/:slug/pages/tree", { config: { rateLimit: publicReadRateLimit } }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    if (!isValidPublicSpaceSlug(slug)) {
      return reply.status(400).send({ status: "error", message: "Invalid space slug" });
    }
    const space = await spacesService.getSpaceBySlug(slug);
    if (!space) {
      return reply.status(404).send({ status: "error", message: "Space not found" });
    }
    const { tree, etag } = await getPublishedTreeCached(space.id);
    const treeEtag = `"${space.id}:${etag}"`;
    const ifNoneMatch = request.headers["if-none-match"];
    if (ifNoneMatch === treeEtag || ifNoneMatch === `W/${treeEtag}`) {
      reply.header("ETag", treeEtag);
      reply.header("Cache-Control", "no-store");
      return reply.status(304).send();
    }
    reply.header("ETag", treeEtag);
    reply.header("Cache-Control", "no-store");
    return { data: tree };
  });

  fastify.delete(
    "/spaces/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user!.id;
      await spacesService.deleteSpace(id, userId);
      return reply.status(204).send();
    }
  );

  fastify.patch("/spaces/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateSpaceSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        status: "error",
        message: "Validation failed",
        errors: parsed.error.errors,
      });
    }
    const userId = request.user!.id;
    const space = await spacesService.updateSpace(id, parsed.data, userId);
    return { data: space };
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
