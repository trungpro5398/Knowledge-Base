import type { FastifyRequest, FastifyReply } from "fastify";

export type AuthHandlers = {
  authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  requireSpaceRole: (role: "viewer" | "editor" | "admin") => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  requirePageRole: (role: "viewer" | "editor" | "admin") => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
};
