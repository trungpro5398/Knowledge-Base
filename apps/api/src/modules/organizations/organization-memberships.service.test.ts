import assert from "node:assert/strict";
import test from "node:test";
import { ForbiddenError, NotFoundError, ValidationError } from "../../utils/errors.js";
import { assertOrganizationMembershipMutation } from "./organization-memberships.service.js";

test("organization membership statuses preserve authorization errors", () => {
  assert.throws(
    () => assertOrganizationMembershipMutation("forbidden", "sửa role của"),
    ForbiddenError
  );
  assert.throws(
    () => assertOrganizationMembershipMutation("owner_required", "sửa role của"),
    ForbiddenError
  );
  assert.throws(
    () => assertOrganizationMembershipMutation("member_not_found", "sửa role của"),
    NotFoundError
  );
});

test("organization membership statuses preserve owner invariants", () => {
  assert.throws(
    () => assertOrganizationMembershipMutation("last_owner", "sửa role của"),
    ValidationError
  );
  assert.doesNotThrow(() => assertOrganizationMembershipMutation("success", "sửa role của"));
});
