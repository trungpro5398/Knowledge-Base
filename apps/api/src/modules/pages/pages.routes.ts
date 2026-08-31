import { FastifyInstance } from "fastify";
import type { AuthHandlers } from "../../routes/auth-types.js";
import * as pagesService from "./pages.service.js";
import * as templatesRepo from "./templates.repo.js";
import {
  createPageSchema,
  updatePageSchema,
  createVersionSchema,
  publishSchema,
  reorderPagesSchema,
} from "@kb/shared";

export async function pagesRoutes(fastify: FastifyInstance, auth: AuthHandlers) {
  const { authenticate, requireSpaceRole, requirePageRole } = auth;

  fastify.get(
    "/spaces/:spaceId/templates",
    { preHandler: [authenticate, requireSpaceRole("editor")] },
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
      const tree = await pagesService.getPagesTree(spaceId, {
        publishedOnly: request.spaceRole === "viewer",
      });
      return { data: tree };
    }
  );

  fastify.get(
    "/pages/:id",
    { preHandler: [authenticate, requirePageRole("viewer")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const page = await pagesService.getPage(id, {
        publishedOnly: request.spaceRole === "viewer",
      });
      return { data: page };
    }
  );

  fastify.post(
    "/pages",
    { preHandler: [authenticate] },
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
    { preHandler: [authenticate] },
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
      const page = await pagesService.updatePage(id, parsed.data, request.user!.id);
      return { data: page };
    }
  );

  fastify.delete(
    "/pages/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user!.id;
      await pagesService.softDeletePage(id, userId);
      return reply.status(204).send();
    }
  );

  fastify.post(
    "/pages/:id/versions",
    {
      preHandler: [authenticate],
      // The editor autosaves at most once every two seconds, so this leaves
      // headroom for normal work while preventing unbounded version writes.
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
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
          draftUpdate: parsed.data.draft_update,
        },
        userId
      );
      return reply.status(201).send({
        data: {
          id: version.id,
          page_id: version.page_id,
          summary: version.summary,
          created_by: version.created_by,
          created_at: version.created_at,
        },
      });
    }
  );

  fastify.post(
    "/pages/:id/publish",
    {
      preHandler: [authenticate],
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
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
      const page = await pagesService.publishPage(id, parsed.data.version_id, request.user!.id);
      return { data: page };
    }
  );

  fastify.get(
    "/pages/:id/versions",
    { preHandler: [authenticate, requirePageRole("editor")] },
    async (request) => {
      const { id } = request.params as { id: string };
      const versions = await pagesService.listVersions(id);
      return { data: versions };
    }
  );

  fastify.get(
    "/pages/:id/versions/:versionId",
    { preHandler: [authenticate, requirePageRole("editor")] },
    async (request) => {
      const { id, versionId } = request.params as { id: string; versionId: string };
      const version = await pagesService.getVersion(id, versionId);
      return { data: version };
    }
  );

  fastify.post(
    "/spaces/:spaceId/pages/reorder",
    {
      preHandler: [authenticate],
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { spaceId } = request.params as { spaceId: string };
      const body = request.body as unknown;
      let candidate: unknown;

      if (Array.isArray(body)) {
        candidate = body;
      } else if (typeof body === "string" && body.trim().length > 0) {
        try {
          const parsed = JSON.parse(body);
          if (Array.isArray(parsed)) {
            candidate = parsed;
          } else if (parsed && typeof parsed === "object" && Array.isArray((parsed as any).updates)) {
            candidate = (parsed as { updates: unknown }).updates;
          }
        } catch {
          // ignore parse errors
        }
      } else if (body && typeof body === "object") {
        candidate = (body as { updates?: unknown }).updates;
      }

      const parsed = reorderPagesSchema.safeParse(candidate);
      if (!parsed.success) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid page reorder request",
          errors: parsed.error.errors,
        });
      }

      await pagesService.reorderPages(spaceId, parsed.data, request.user!.id);
      return { data: { success: true } };
    }
  );
}
