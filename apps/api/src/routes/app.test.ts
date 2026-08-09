import assert from "node:assert/strict";
import test from "node:test";

test("the API application boots and serves its health endpoint", async () => {
  process.env.VERCEL = "1";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  const { fastify } = await import("../index.js");

  const response = await fastify.inject({ method: "GET", url: "/health" });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().status, "ok");
  await fastify.close();
});
