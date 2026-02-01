import { FastifyInstance } from "fastify";
import type { AuthHandlers } from "../../routes/auth-types.js";
import * as pagesService from "./pages.service.js";
import * as templatesRepo from "./templates.repo.js";
import { createPageSchema, updatePageSchema, createVersionSchema, publishSchema } from "@kb/shared";

export async function pagesRoutes(fastify: FastifyInstance, auth: AuthHandlers) {
  const { authenticate, requireSpaceRole, requirePageRole } = auth;

  fastify.get(
    "/spaces/:spaceId/templates",
    { preHandler: [authenticate, requireSpaceRole("viewer")] },
    async (request) => {
      const { spaceId } = request.params as { spaceId: string };
      const templates = await templatesRepo.getTemplatesBySpaceId(spaceId);
      return { data: templates };
    }
  );

  fastify.get(
    "/spaces/:spaceId/pages/tree",
    { preHandler: [authenticate, requireSpaceRole("viewer")] },
    async (request) => {
      const { spaceId } = request.params as { spaceId: string };
      const tree = await pagesService.getPagesTree(spaceId);
      return { data: tree };
    }
  );

  fastify.get(
    "/pages/:id",
    { preHandler: [authenticate, requirePageRole("viewer")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const page = await pagesService.getPage(id);
      return { data: page };
    }
  );

  fastify.post(
    "/pages",
    { preHandler: [authenticate, requireSpaceRole("editor")] },
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
      const page = await pagesService.createPage(
        {
          spaceId: parsed.data.space_id,
          parentId: parsed.data.parent_id ?? null,
          title: parsed.data.title,
          slug: parsed.data.slug,
          templateId: parsed.data.template_id ?? null,
        },
        userId
      );
      return reply.status(201).send({ data: page });
    }
  );

  fastify.patch(
    "/pages/:id",
    { preHandler: [authenticate, requirePageRole("editor")] },
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
    { preHandler: [authenticate, requirePageRole("editor")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user!.id;
      await pagesService.softDeletePage(id, userId);
      return reply.status(204).send();
    }
  );

  fastify.post(
    "/pages/:id/versions",
    { preHandler: [authenticate, requirePageRole("editor")] },
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
    { preHandler: [authenticate, requirePageRole("editor")] },
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
    { preHandler: [authenticate, requirePageRole("viewer")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const versions = await pagesService.listVersions(id);
      return { data: versions };
    }
  );

  fastify.post(
    "/spaces/:spaceId/pages/reorder",
    { preHandler: [authenticate, requireSpaceRole("editor")] },
    async (request, reply) => {
      const { spaceId } = request.params as { spaceId: string };
      const { updates } = request.body as { updates: Array<{ id: string; sort_order: number; parent_id?: string | null }> };
      
      if (!Array.isArray(updates) || updates.length === 0) {
        return reply.status(400).send({
          status: "error",
          message: "Updates array is required",
        });
      }

      await pagesService.reorderPages(spaceId, updates);
      return { data: { success: true } };
    }
  );
}
