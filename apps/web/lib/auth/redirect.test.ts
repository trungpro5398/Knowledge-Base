import assert from "node:assert/strict";
import test from "node:test";
import { safeRedirectPath } from "./redirect.js";

test("safeRedirectPath permits same-app relative paths", () => {
  assert.equal(safeRedirectPath("/admin/spaces?id=1#members"), "/admin/spaces?id=1#members");
});

test("safeRedirectPath rejects external and backslash redirects", () => {
  assert.equal(safeRedirectPath("https://attacker.example"), "/admin");
  assert.equal(safeRedirectPath("//attacker.example"), "/admin");
  assert.equal(safeRedirectPath("/\\attacker.example"), "/admin");
});
