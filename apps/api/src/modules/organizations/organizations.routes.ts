import { FastifyInstance } from "fastify";
import type { AuthHandlers } from "../../routes/auth-types.js";
import * as organizationsService from "./organizations.service.js";

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
}
