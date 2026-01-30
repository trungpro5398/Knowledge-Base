import { FastifyInstance } from "fastify";
import * as pagesService from "./pages.service.js";
import { createPageSchema, updatePageSchema, createVersionSchema, publishSchema } from "@kb/shared";
import { pool } from "../../db/pool.js";

export async function pagesRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/spaces/:spaceId/pages/tree",
    { preHandler: [fastify.authenticate, fastify.requireSpaceRole("viewer")] },
    async (request, reply) => {
      const { spaceId } = request.params as { spaceId: string };
      const tree = await pagesService.getPagesTree(spaceId);
      return { data: tree };
    }
  );

  fastify.get(
    "/pages/:id",
    { preHandler: [fastify.authenticate, fastify.requirePageRole("viewer")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const page = await pagesService.getPage(id);
      return { data: page };
    }
  );

  fastify.post(
    "/pages",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = createPageSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          status: "error",
          message: "Validation failed",
          errors: parsed.error.errors,
        });
      }
      const userId = request.user!.id;
      if (pool) {
        const { rows } = await pool.query(
          "SELECT 1 FROM memberships WHERE user_id = $1 AND space_id = $2 AND role IN ('editor','admin')",
          [userId, parsed.data.space_id]
        );
        if (rows.length === 0) {
          return reply.status(403).send({ status: "error", message: "Not allowed to create pages in this space" });
        }
      }
      const page = await pagesService.createPage(
        {
          spaceId: parsed.data.space_id,
          parentId: parsed.data.parent_id ?? null,
          title: parsed.data.title,
          slug: parsed.data.slug,
        },
        userId
      );
      return reply.status(201).send({ data: page });
    }
  );

  fastify.patch(
    "/pages/:id",
    { preHandler: [fastify.authenticate, fastify.requirePageRole("editor")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = updatePageSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          status: "error",
          message: "Validation failed",
          errors: parsed.error.errors,
        });
      }
      const page = await pagesService.updatePage(id, parsed.data);
      return { data: page };
    }
  );

  fastify.delete(
    "/pages/:id",
    { preHandler: [fastify.authenticate, fastify.requirePageRole("editor")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user!.id;
      await pagesService.softDeletePage(id, userId);
      return reply.status(204).send();
    }
  );

  fastify.post(
    "/pages/:id/versions",
    { preHandler: [fastify.authenticate, fastify.requirePageRole("editor")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = createVersionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          status: "error",
          message: "Validation failed",
          errors: parsed.error.errors,
        });
      }
      const userId = request.user!.id;
      const version = await pagesService.createVersion(
        id,
        {
          contentMd: parsed.data.content_md ?? undefined,
          contentJson: parsed.data.content_json ?? undefined,
          summary: parsed.data.summary ?? undefined,
        },
        userId
      );
      return reply.status(201).send({ data: version });
    }
  );

  fastify.post(
    "/pages/:id/publish",
    { preHandler: [fastify.authenticate, fastify.requirePageRole("editor")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = publishSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          status: "error",
          message: "Validation failed",
          errors: parsed.error.errors,
        });
      }
      const page = await pagesService.publishPage(id, parsed.data.version_id);
      return { data: page };
    }
  );

  fastify.get(
    "/pages/:id/versions",
    { preHandler: [fastify.authenticate, fastify.requirePageRole("viewer")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const versions = await pagesService.listVersions(id);
      return { data: versions };
    }
  );
}
