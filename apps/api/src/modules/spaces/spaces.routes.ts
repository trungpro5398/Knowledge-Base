import { FastifyInstance } from "fastify";
import * as spacesService from "./spaces.service.js";
import * as pagesService from "../pages/pages.service.js";
import { createSpaceSchema } from "@kb/shared";

export async function spacesRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/spaces",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.user!.id;
      const spaces = await spacesService.listSpaces(userId);
      return { data: spaces };
    }
  );

  fastify.get(
    "/spaces/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user!.id;
      const space = await spacesService.getSpace(id, userId);
      return { data: space };
    }
  );

  fastify.get(
    "/spaces/by-slug/:slug/pages/by-path",
    { preHandler: [] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const path = (request.query as { path?: string }).path;
      if (!path) return reply.status(400).send({ status: "error", message: "path query required" });
      const space = await spacesService.getSpaceBySlug(slug);
      if (!space) return reply.status(404).send({ status: "error", message: "Space not found" });
      const page = await import("../pages/pages.repo.js").then((m) => m.getPageByPath(space.id, path));
      if (!page) return reply.status(404).send({ status: "error", message: "Page not found" });
      return { data: page };
    }
  );

  fastify.get(
    "/spaces/by-slug/:slug/pages/tree",
    { preHandler: [] },
    async (request, reply) => {
      const { slug } = request.params as { slug: string };
      const space = await spacesService.getSpaceBySlug(slug);
      if (!space) return reply.status(404).send({ status: "error", message: "Space not found" });
      const tree = await pagesService.getPagesTree(space.id, { publishedOnly: true });
      return { data: tree };
    }
  );

  fastify.post(
    "/spaces",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
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
    }
  );
}
