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

const fastify = Fastify({ logger: logger as any });

await fastify.register(helmet, { contentSecurityPolicy: false });
await fastify.register(cors, {
  origin: config.corsOrigins,
  credentials: true,
});
await fastify.register(compress);
await fastify.register(rateLimit, {
  max: 100,
  timeWindow: "15 minutes",
});

await fastify.register(authPlugin);
await fastify.register(rbacPlugin);
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
