import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createClient } from "@supabase/supabase-js";
import { config } from "../config/env.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: { id: string; email?: string };
  }
}

export async function authPlugin(fastify: FastifyInstance) {
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return reply.status(401).send({ status: "error", message: "No token provided" });
    }

    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return reply.status(401).send({ status: "error", message: "Invalid token" });
      }
      request.user = { id: user.id, email: user.email };
    } catch {
      return reply.status(401).send({ status: "error", message: "Invalid token" });
    }
  });
}
