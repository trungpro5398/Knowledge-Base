import fp from "fastify-plugin";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { config } from "../config/env.js";
import { verifyToken } from "../utils/jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: { id: string; email?: string };
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireSpaceRole: (role: "viewer" | "editor" | "admin") => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requirePageRole: (role: "viewer" | "editor" | "admin") => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

async function authPlugin(fastify: FastifyInstance) {
  if (!config.supabaseUrl) {
    fastify.log.warn("SUPABASE_URL not set. Auth will fail.");
  }

  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return reply.status(401).send({ status: "error", message: "No token provided" });
    }

    try {
      const user = await verifyToken(token);
      request.user = { id: user.id, email: user.email };
    } catch (err) {
      request.log.debug({ err }, "JWT verification failed");
      return reply.status(401).send({ status: "error", message: "Invalid token" });
    }
  });
}

export default fp(authPlugin, { name: "auth" });
