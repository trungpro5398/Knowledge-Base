import { FastifyInstance } from "fastify";

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));
}
