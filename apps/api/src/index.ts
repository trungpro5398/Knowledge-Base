import Fastify from "fastify";
import compress from "@fastify/compress";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config/env.js";
import { logger } from "./config/logger.js";
import authPlugin from "./plugins/auth.js";
import rbacPlugin from "./plugins/rbac.js";
import { registerRoutes } from "./routes/index.js";
import { recordRequest } from "./utils/metrics.js";

// Version content is capped at 1 MB in the shared schema. Leave enough room
// for JSON framing while rejecting oversized bodies before they consume memory.
export const fastify = Fastify({
  loggerInstance: logger,
  bodyLimit: 1_100_000,
  // Fastify assigns the top-level value after constructing Node's HTTP
  // server. Pass it through at construction time as well so stalled bodies
  // are actually rejected and multipart reservations are released.
  requestTimeout: 65_000,
  http: {
    requestTimeout: 65_000,
    connectionsCheckingInterval: 1_000,
  },
});

fastify.addHook("onRequest", (request, _reply, done) => {
  request._startAt = process.hrtime.bigint();
  done();
});

fastify.addHook("onResponse", (request, reply, done) => {
  if (request._startAt) {
    const durationMs = Number(process.hrtime.bigint() - request._startAt) / 1_000_000;
    recordRequest(request, reply, durationMs);
  }
  done();
});

await fastify.register(helmet, { contentSecurityPolicy: false });
await fastify.register(cors, {
  origin: config.corsOrigins,
  credentials: true,
});
await fastify.register(compress);

await fastify.register(authPlugin);
await fastify.register(rbacPlugin);
await fastify.register(rateLimit, {
  max: 1000,
  timeWindow: "15 minutes",
  keyGenerator: (request) => {
    const userId = (request as any).user?.id;
    return userId ?? request.ip;
  },
});
await registerRoutes(fastify);

const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

const shutdown = async (signal: string) => {
  fastify.log.info({ signal }, "Shutting down API server");
  try {
    await fastify.close();
    process.exit(0);
  } catch (error) {
    fastify.log.error(error, "Failed to shut down API server cleanly");
    process.exit(1);
  }
};

// Vercel imports this module as a serverless handler. A traditional listener
// is only needed for local development and the standalone Fly deployment.
if (!process.env.VERCEL) {
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
  start();
}

export default fastify;
