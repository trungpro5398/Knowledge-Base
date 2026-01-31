import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config/env.js";
import { logger } from "./config/logger.js";
import { authPlugin } from "./plugins/auth.js";
import { rbacPlugin } from "./plugins/rbac.js";
import { registerRoutes } from "./routes/index.js";

const fastify = Fastify({ logger: logger as any });

await fastify.register(helmet, { contentSecurityPolicy: false });
await fastify.register(cors, {
  origin: config.corsOrigins,
  credentials: true,
});
await fastify.register(rateLimit, {
  max: 100,
  timeWindow: "15 minutes",
});

// Auth, RBAC and routes must run on the same encapsulated instance so
// fastify.authenticate / requireSpaceRole / requirePageRole are available to routes.
await fastify.register(async (instance) => {
  await instance.register(authPlugin);
  await instance.register(rbacPlugin);
  await registerRoutes(instance);
});

const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
