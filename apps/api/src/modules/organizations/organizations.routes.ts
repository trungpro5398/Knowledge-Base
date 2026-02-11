import { FastifyInstance } from "fastify";
import type { AuthHandlers } from "../../routes/auth-types.js";
import * as organizationsService from "./organizations.service.js";
import * as orgMembershipsService from "./organization-memberships.service.js";
import { z } from "zod";

export async function organizationsRoutes(fastify: FastifyInstance, auth: AuthHandlers) {
  const { authenticate } = auth;

  // List user's organizations
  fastify.get("/organizations", { preHandler: [authenticate] }, async (request) => {
    const userId = request.user!.id;
    const organizations = await organizationsService.listOrganizations(userId);
    return { data: organizations };
  });

  // Get organization by ID
  fastify.get("/organizations/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    const organization = await organizationsService.getOrganization(id, userId);
    if (!organization) {
      return reply.status(404).send({ status: "error", message: "Organization not found" });
    }
    return { data: organization };
  });

  // Get organization spaces
  fastify.get("/organizations/:id/spaces", { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    const spaces = await organizationsService.getOrganizationSpaces(id, userId);
    return { data: spaces };
  });

  // Create organization
  fastify.post("/organizations", { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.id;
    const data = request.body as { name: string; slug: string; icon?: string; description?: string };
    
    const organization = await organizationsService.createOrganization(data, userId);
    return reply.status(201).send({ data: organization });
  });

  // Delete organization
  fastify.delete("/organizations/:id", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    await organizationsService.deleteOrganization(id, userId);
    return reply.status(204).send();
  });

  // Organization memberships routes
  const addOrgMemberSchema = z.object({
    userId: z.string().uuid().optional(),
    email: z.string().email().optional(),
    role: z.enum(["member", "admin", "owner"]),
  });

  const updateOrgRoleSchema = z.object({
    role: z.enum(["member", "admin", "owner"]),
  });

  // List organization members
  fastify.get(
    "/organizations/:organizationId/members",
    { preHandler: [authenticate] },
    async (request) => {
      const { organizationId } = request.params as { organizationId: string };
      const userId = request.user!.id;
      const members = await orgMembershipsService.listOrganizationMembers(organizationId, userId);
      return { data: members };
    }
  );

  // Add member by user ID or email
  fastify.post(
    "/organizations/:organizationId/members",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { organizationId } = request.params as { organizationId: string };
      const userId = request.user!.id;
      const parsed = addOrgMemberSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          status: "error",
          message: "Validation failed",
          errors: parsed.error.errors,
        });
      }

      let targetUserId: string;
      if (parsed.data.userId) {
        targetUserId = parsed.data.userId;
      } else if (parsed.data.email) {
        // Get user by email
        const { getUserByEmail } = await import("../memberships/memberships.service.js");
        const user = await getUserByEmail(parsed.data.email);
        targetUserId = user.id;
      } else {
        return reply.status(400).send({
          status: "error",
          message: "userId or email is required",
        });
      }

      const member = await orgMembershipsService.addOrganizationMember(
        organizationId,
        targetUserId,
        parsed.data.role,
        userId
      );
      return reply.status(201).send({ data: member });
    }
  );

  // Update member role
  fastify.patch(
    "/organizations/:organizationId/members/:userId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { organizationId, userId: targetUserId } = request.params as {
        organizationId: string;
        userId: string;
      };
      const userId = request.user!.id;
      const parsed = updateOrgRoleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          status: "error",
          message: "Validation failed",
          errors: parsed.error.errors,
        });
      }
      const member = await orgMembershipsService.updateOrganizationMemberRole(
        organizationId,
        targetUserId,
        parsed.data.role,
        userId
      );
      return { data: member };
    }
  );

  // Remove member
  fastify.delete(
    "/organizations/:organizationId/members/:userId",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { organizationId, userId: targetUserId } = request.params as {
        organizationId: string;
        userId: string;
      };
      const userId = request.user!.id;
      await orgMembershipsService.removeOrganizationMember(organizationId, targetUserId, userId);
      return reply.status(204).send();
    }
  );
}
