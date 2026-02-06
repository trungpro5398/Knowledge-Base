import { FastifyInstance } from "fastify";
import type { AuthHandlers } from "../../routes/auth-types.js";
import * as membershipsService from "./memberships.service.js";
import { z } from "zod";

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["viewer", "editor", "admin"]),
});

const addMemberByEmailSchema = z.object({
  email: z.string().email(),
  role: z.enum(["viewer", "editor", "admin"]),
});

const updateRoleSchema = z.object({
  role: z.enum(["viewer", "editor", "admin"]),
});

const searchUsersQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  organizationId: z.string().uuid().optional(),
  spaceId: z.string().uuid().optional(),
  pageId: z.string().uuid().optional(),
});

export async function membershipsRoutes(fastify: FastifyInstance, auth: AuthHandlers) {
  const { authenticate, requireSpaceRole } = auth;

  // List members of a space
  fastify.get(
    "/spaces/:spaceId/members",
    { preHandler: [authenticate, requireSpaceRole("admin")] },
    async (request) => {
      const { spaceId } = request.params as { spaceId: string };
      const userId = request.user!.id;
      const members = await membershipsService.listMembers(spaceId, userId);
      return { data: members };
    }
  );

  // Add member by user ID
  fastify.post(
    "/spaces/:spaceId/members",
    { preHandler: [authenticate, requireSpaceRole("admin")] },
    async (request, reply) => {
      const { spaceId } = request.params as { spaceId: string };
      const userId = request.user!.id;
      const parsed = addMemberSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          status: "error",
          message: "Validation failed",
          errors: parsed.error.errors,
        });
      }
      const member = await membershipsService.addMember(
        spaceId,
        parsed.data.userId,
        parsed.data.role,
        userId
      );
      return reply.status(201).send({ data: member });
    }
  );

  // Add member by email
  fastify.post(
    "/spaces/:spaceId/members/by-email",
    { preHandler: [authenticate, requireSpaceRole("admin")] },
    async (request, reply) => {
      const { spaceId } = request.params as { spaceId: string };
      const userId = request.user!.id;
      const parsed = addMemberByEmailSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          status: "error",
          message: "Validation failed",
          errors: parsed.error.errors,
        });
      }
      const targetUser = await membershipsService.getUserByEmail(parsed.data.email);
      const member = await membershipsService.addMember(
        spaceId,
        targetUser.id,
        parsed.data.role,
        userId
      );
      return reply.status(201).send({ data: member });
    }
  );

  // Update member role
  fastify.patch(
    "/spaces/:spaceId/members/:userId",
    { preHandler: [authenticate, requireSpaceRole("admin")] },
    async (request, reply) => {
      const { spaceId, userId: targetUserId } = request.params as { spaceId: string; userId: string };
      const userId = request.user!.id;
      const parsed = updateRoleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          status: "error",
          message: "Validation failed",
          errors: parsed.error.errors,
        });
      }
      const member = await membershipsService.updateMemberRole(
        spaceId,
        targetUserId,
        parsed.data.role,
        userId
      );
      return { data: member };
    }
  );

  // Remove member
  fastify.delete(
    "/spaces/:spaceId/members/:userId",
    { preHandler: [authenticate, requireSpaceRole("admin")] },
    async (request, reply) => {
      const { spaceId, userId: targetUserId } = request.params as { spaceId: string; userId: string };
      const userId = request.user!.id;
      await membershipsService.removeMember(spaceId, targetUserId, userId);
      return reply.status(204).send();
    }
  );

  // Search users (for inviting)
  fastify.get(
    "/users/search",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const parsed = searchUsersQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          status: "error",
          message: "Validation failed",
          errors: parsed.error.errors,
        });
      }

      const users = await membershipsService.searchUsers(parsed.data, request.user!.id);
      return { data: users };
    }
  );
}
