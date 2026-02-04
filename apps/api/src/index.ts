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

const fastify = Fastify({ logger: logger as any });

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

start();
