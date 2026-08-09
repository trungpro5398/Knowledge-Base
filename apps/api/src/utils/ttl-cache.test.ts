import assert from "node:assert/strict";
import test from "node:test";
import { TtlCache } from "./ttl-cache.js";

test("TtlCache expires entries and stays within its entry limit", () => {
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;

  try {
    const cache = new TtlCache<number>({ defaultTtlMs: 50, maxEntries: 2 });
    cache.set("first", 1);
    cache.set("second", 2);
    cache.set("third", 3);

    assert.equal(cache.get("first"), undefined);
    assert.equal(cache.get("second"), 2);
    assert.equal(cache.get("third"), 3);

    now += 51;
    assert.equal(cache.get("second"), undefined);
    assert.equal(cache.get("third"), undefined);
  } finally {
    Date.now = originalNow;
  }
});
