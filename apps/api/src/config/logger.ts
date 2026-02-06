import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pino = require("pino");

const opts: Record<string, unknown> = {
  level: process.env.LOG_LEVEL || "info",
};
if (process.env.NODE_ENV === "development") {
  opts.transport = { target: "pino-pretty", options: { colorize: true } };
}

export const logger = pino(opts);
