import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createClient } from "@supabase/supabase-js";
import { config } from "../config/env.js";

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

export async function authPlugin(fastify: FastifyInstance) {
  let supabase: ReturnType<typeof createClient> | null = null;
  const getSupabase = () => {
    if (!supabase) supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    return supabase;
  };
  // Decorate first so route registration never sees undefined preHandler (e.g. if createClient fails later on missing env)
  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return reply.status(401).send({ status: "error", message: "No token provided" });
    }

    try {
      const { data: { user }, error } = await getSupabase().auth.getUser(token);
      if (error || !user) {
        return reply.status(401).send({ status: "error", message: "Invalid token" });
      }
      request.user = { id: user.id, email: user.email };
    } catch {
      return reply.status(401).send({ status: "error", message: "Invalid token" });
    }
  });
}
