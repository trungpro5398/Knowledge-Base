import { FastifyInstance } from "fastify";
import type { AuthHandlers } from "../../routes/auth-types.js";
import * as organizationsService from "./organizations.service.js";
import * as orgMembershipsService from "./organization-memberships.service.js";
import { z } from "zod";

export async function organizationsRoutes(fastify: FastifyInstance, auth: AuthHandlers) {
  const { authenticate } = auth;
  const createOrganizationSchema = z.object({
    name: z.string().trim().min(1, "Tên kho tài liệu là bắt buộc").max(120),
    slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Đường dẫn không hợp lệ").max(80),
    icon: z.string().trim().max(8).optional(),
    description: z.string().trim().max(500).optional(),
  });

  fastify.get("/admin/dashboard", { preHandler: [authenticate] }, async (request) => {
    const data = await organizationsService.getAdminDashboard(request.user!.id);
    return { data };
  });

  // List user's organizations
  fastify.get("/organizations", { preHandler: [authenticate] }, async (request) => {
    const userId = request.user!.id;
    const organizations = await organizationsService.listOrganizations(userId);
    return { data: organizations };
  });

  fastify.get("/organizations/:id/bootstrap", { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!z.string().uuid().safeParse(id).success) {
      return reply.status(400).send({ status: "error", message: "Invalid organization ID" });
    }
    const includeMembers = (request.query as { members?: string }).members === "1";
    const data = await organizationsService.getOrganizationBootstrap(
      id,
      request.user!.id,
      includeMembers
    );
    return { data };
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
    const parsed = createOrganizationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        status: "error",
        message: parsed.error.errors[0]?.message ?? "Thông tin kho tài liệu chưa hợp lệ",
        errors: parsed.error.errors,
      });
    }

    const organization = await organizationsService.createOrganization(parsed.data, userId);
    return reply.status(201).send({ data: organization });
  });

  fastify.post("/organizations/with-space", { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = createOrganizationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        status: "error",
        message: parsed.error.errors[0]?.message ?? "Thông tin kho tài liệu chưa hợp lệ",
        errors: parsed.error.errors,
      });
    }
    const data = await organizationsService.createOrganizationWithInitialSpace(
      parsed.data,
      request.user!.id
    );
    return reply.status(201).send({ data });
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
    email: z.string().trim().email().max(320).optional(),
    role: z.enum(["member", "admin", "owner"]),
  }).refine((value) => Boolean(value.userId) !== Boolean(value.email), {
    message: "Provide exactly one of userId or email",
  });

  const updateOrgRoleSchema = z.object({
    role: z.enum(["member", "admin", "owner"]),
  });
  const organizationParamsSchema = z.object({ organizationId: z.string().uuid() });
  const organizationMemberParamsSchema = organizationParamsSchema.extend({
    userId: z.string().uuid(),
  });

  // List organization members
  fastify.get(
    "/organizations/:organizationId/members",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const parsedParams = organizationParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(400).send({ status: "error", message: "Invalid organization ID" });
      }
      const { organizationId } = parsedParams.data;
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
      const parsedParams = organizationParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(400).send({ status: "error", message: "Invalid organization ID" });
      }
      const { organizationId } = parsedParams.data;
      const userId = request.user!.id;
      const parsed = addOrgMemberSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          status: "error",
          message: "Validation failed",
          errors: parsed.error.errors,
        });
      }

      const member = await orgMembershipsService.addOrganizationMember(
        organizationId,
        { userId: parsed.data.userId, email: parsed.data.email },
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
      const parsedParams = organizationMemberParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(400).send({ status: "error", message: "Invalid member ID" });
      }
      const { organizationId, userId: targetUserId } = parsedParams.data;
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
      const parsedParams = organizationMemberParamsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.status(400).send({ status: "error", message: "Invalid member ID" });
      }
      const { organizationId, userId: targetUserId } = parsedParams.data;
      const userId = request.user!.id;
      await orgMembershipsService.removeOrganizationMember(organizationId, targetUserId, userId);
      return reply.status(204).send();
    }
  );
}
