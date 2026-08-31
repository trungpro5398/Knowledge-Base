import { FastifyInstance } from "fastify";
import type { AuthHandlers } from "../../routes/auth-types.js";
import * as commentsRepo from "./comments.repo.js";
import { createCommentSchema } from "@kb/shared";
import { ForbiddenError, NotFoundError, ValidationError } from "../../utils/errors.js";
import { decodeCommentCursor, encodeCommentCursor } from "./comments-pagination.js";
import { z } from "zod";

const listCommentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().min(1).max(256).optional(),
});

export async function commentsRoutes(fastify: FastifyInstance, auth: AuthHandlers) {
  const { authenticate } = auth;
  fastify.get(
    "/pages/:id/comments",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsedQuery = listCommentsQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return reply.status(400).send({
          status: "error",
          message: "Validation failed",
          errors: parsedQuery.error.errors,
        });
      }
      const cursor = parsedQuery.data.cursor
        ? decodeCommentCursor(parsedQuery.data.cursor) ?? undefined
        : undefined;
      if (parsedQuery.data.cursor && !cursor) {
        return reply.status(400).send({ status: "error", message: "Invalid comment cursor" });
      }
      const result = await commentsRepo.listByPageForMember(id, request.user!.id, {
        cursor,
        limit: parsedQuery.data.limit,
      });
      if (result.status === "page_not_found") throw new NotFoundError("Page not found");
      if (result.status === "not_member") throw new ForbiddenError("Not a member of this space");
      if (result.status === "requires_editor") {
        throw new ForbiddenError("Draft pages require editor access");
      }
      if (result.status !== "success") {
        throw new ValidationError("Invalid comment cursor");
      }
      const lastComment = result.comments.at(-1);
      return {
        data: result.comments,
        pagination: {
          limit: parsedQuery.data.limit,
          next_cursor:
            result.has_more && lastComment
              ? encodeCommentCursor(lastComment.created_at_text, lastComment.id)
              : null,
        },
      };
    }
  );

  fastify.post(
    "/pages/:id/comments",
    {
      preHandler: [authenticate],
      config: { rateLimit: { max: 30, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = createCommentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          status: "error",
          message: "Validation failed",
          errors: parsed.error.errors,
        });
      }
      const userId = request.user!.id;
      const result = await commentsRepo.createForMember({
        pageId: id,
        versionId: parsed.data.version_id ?? null,
        parentId: parsed.data.parent_id ?? null,
        content: parsed.data.content,
        authorId: userId,
      });
      if (result.status === "page_not_found") throw new NotFoundError("Page not found");
      if (result.status === "not_member") throw new ForbiddenError("Not a member of this space");
      if (result.status === "requires_editor") {
        throw new ForbiddenError("Draft pages require editor access");
      }
      if (result.status === "published_version_not_found") {
        throw new ValidationError("Published version not found");
      }
      if (result.status === "invalid_version") {
        throw new ValidationError("Version must belong to the commented page");
      }
      if (result.status === "viewer_version_forbidden") {
        throw new ValidationError("Viewers can only comment on the published version");
      }
      if (result.status === "invalid_parent") {
        throw new ValidationError("Parent comment must belong to the commented page");
      }
      if (result.status === "viewer_parent_forbidden") {
        throw new ValidationError("Parent comment belongs to a draft version");
      }
      if (result.status === "invalid_content") {
        throw new ValidationError("Invalid comment content");
      }
      if (result.status !== "success" || !result.comment) {
        throw new Error(`Unexpected comment creation result: ${result.status}`);
      }
      return reply.status(201).send({ data: result.comment });
    }
  );
}
