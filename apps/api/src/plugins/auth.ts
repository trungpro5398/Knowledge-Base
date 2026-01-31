import fp from "fastify-plugin";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
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

async function authPlugin(fastify: FastifyInstance) {
  // Validate required env vars
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    fastify.log.warn("SUPABASE_URL or SUPABASE_ANON_KEY not set. Auth will fail.");
  }

  let supabase: SupabaseClient | null = null;

  const getSupabase = (): SupabaseClient => {
    if (!supabase) {
      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required");
      }
      supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    }
    return supabase;
  };

  // Decorate authenticate function
  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return reply.status(401).send({ status: "error", message: "No token provided" });
    }

    try {
      const { data: { user }, error } = await getSupabase().auth.getUser(token);
      if (error || !user) {
        request.log.debug({ error }, "Auth failed");
        return reply.status(401).send({ status: "error", message: "Invalid token" });
      }
      request.user = { id: user.id, email: user.email ?? undefined };
    } catch (err) {
      request.log.error({ err }, "Auth error");
      return reply.status(401).send({ status: "error", message: "Authentication failed" });
    }
  });
}

export default fp(authPlugin, { name: "auth" });
