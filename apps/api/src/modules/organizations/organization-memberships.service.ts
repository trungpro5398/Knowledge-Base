import * as orgMembershipsRepo from "./organization-memberships.repo.js";
import { invalidateSpacesForUser } from "../spaces/spaces-user-cache.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../../utils/errors.js";

// Cache invalidation for organizations - we'll need to create this
function invalidateOrganizationsForUser(userId: string): void {
  // TODO: Implement if we add org cache later
}

export async function listOrganizationMembers(organizationId: string, userId: string) {
  const members = await orgMembershipsRepo.getOrganizationMembershipsForAdmin(
    organizationId,
    userId
  );
  if (!members) throw new NotFoundError("Organization not found");
  return members;
}

export async function addOrganizationMember(
  organizationId: string,
  target: { userId?: string; email?: string },
  role: "member" | "admin" | "owner",
  adminUserId: string
) {
  const result = await orgMembershipsRepo.upsertOrganizationMembershipForAdmin(
    organizationId,
    target,
    role,
    adminUserId
  );
  assertOrganizationMembershipMutation(result.status, "thêm");
  const targetUserId = result.membership!.user_id;
  // Invalidate cache for the new member so they see the organization and its spaces immediately
  invalidateSpacesForUser(targetUserId);
  invalidateOrganizationsForUser(targetUserId);
  return result.membership!;
}

export async function updateOrganizationMemberRole(
  organizationId: string,
  targetUserId: string,
  role: "member" | "admin" | "owner",
  adminUserId: string
) {
  const result = await orgMembershipsRepo.updateOrganizationMembershipRoleForAdmin(
    organizationId,
    targetUserId,
    role,
    adminUserId
  );
  assertOrganizationMembershipMutation(result.status, "sửa role của");
  // Invalidate cache for the updated member
  invalidateSpacesForUser(targetUserId);
  invalidateOrganizationsForUser(targetUserId);
  return result.membership!;
}

export async function removeOrganizationMember(
  organizationId: string,
  targetUserId: string,
  adminUserId: string
) {
  const status = await orgMembershipsRepo.removeOrganizationMembershipForAdmin(
    organizationId,
    targetUserId,
    adminUserId
  );
  assertOrganizationMembershipMutation(status, "xóa");
  // Invalidate cache for the removed member so they don't see the organization/spaces anymore
  invalidateSpacesForUser(targetUserId);
  invalidateOrganizationsForUser(targetUserId);
}

export function assertOrganizationMembershipMutation(
  status: orgMembershipsRepo.OrganizationMembershipMutationStatus,
  action: string
): void {
  if (status === "success") return;
  if (status === "organization_not_found" || status === "member_not_found") {
    throw new NotFoundError("Organization membership not found");
  }
  if (status === "forbidden") {
    throw new ForbiddenError(`Chỉ admin/owner mới được ${action} members`);
  }
  if (status === "owner_required") {
    throw new ForbiddenError("Chỉ owner mới được thêm hoặc thay đổi owner");
  }
  if (status === "last_owner") {
    throw new ValidationError("Không thể xóa owner cuối cùng của organization");
  }
  throw new ValidationError("Thao tác hoặc role không hợp lệ");
}
