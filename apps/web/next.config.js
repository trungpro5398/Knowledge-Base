const path = require("node:path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@kb/shared"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

module.exports = nextConfig;
