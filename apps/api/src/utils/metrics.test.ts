import assert from "node:assert/strict";
import test from "node:test";
import { getMetricsSnapshot, recordRequest } from "./metrics.js";

test("metrics do not retain the raw URL for unmatched routes", () => {
  recordRequest(
    { method: "GET", url: "/unknown/unique-probe", routeOptions: {} } as any,
    { statusCode: 404 } as any,
    1
  );

  const snapshot = getMetricsSnapshot();
  assert.ok(snapshot.requests.byRoute["GET <unmatched>"]);
  assert.equal(snapshot.requests.byRoute["GET /unknown/unique-probe"], undefined);
});

test("route metrics stay within the absolute cardinality limit", () => {
  for (let index = 0; index < 400; index += 1) {
    recordRequest(
      {
        method: index % 2 === 0 ? "GET" : "POST",
        routeOptions: { url: `/bounded-route-${index}` },
      } as any,
      { statusCode: 200 } as any,
      1
    );
  }

  const byRoute = getMetricsSnapshot().requests.byRoute;
  assert.ok(Object.keys(byRoute).length <= 300);
  assert.ok(byRoute["<other>"]);
  assert.equal(byRoute["GET <other>"], undefined);
  assert.equal(byRoute["POST <other>"], undefined);
});
