import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, apiClient } from "./client";

test("caller aborts remain active while the response body is being read", async () => {
  const originalFetch = globalThis.fetch;
  const caller = new AbortController();

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => ({
    status: 200,
    ok: true,
    json: () => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
      queueMicrotask(() => caller.abort(new Error("caller aborted")));
    }),
  })) as typeof fetch;

  try {
    await assert.rejects(
      apiClient("/slow-body", { auth: false, signal: caller.signal }),
      (error: unknown) => error instanceof Error && error.message === "caller aborted"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("non-JSON error bodies retain their HTTP status mapping", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({
    status: 503,
    statusText: "Service Unavailable",
    ok: false,
    json: async () => {
      throw new SyntaxError("not json");
    },
  })) as typeof fetch;

  try {
    await assert.rejects(
      apiClient("/unavailable", { auth: false }),
      (error: unknown) => error instanceof ApiError && error.status === 503
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
