import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_PUBLIC_SEARCH_PAGE,
  isValidPublicSpaceSlug,
  parsePublicSearchPage,
} from "./public-query.js";

test("public search bounds page offsets before database work", () => {
  assert.equal(parsePublicSearchPage(undefined), 1);
  assert.equal(parsePublicSearchPage("12"), 12);
  assert.equal(parsePublicSearchPage("0"), 1);
  assert.equal(parsePublicSearchPage("12abc"), 1);
  assert.equal(parsePublicSearchPage("999999999999999999"), 1);
  assert.equal(parsePublicSearchPage("1000001"), MAX_PUBLIC_SEARCH_PAGE);
});

test("public route only accepts canonical space slugs", () => {
  assert.equal(isValidPublicSpaceSlug("engineering-handbook"), true);
  assert.equal(isValidPublicSpaceSlug("Engineering"), false);
  assert.equal(isValidPublicSpaceSlug("x".repeat(51)), false);
});
