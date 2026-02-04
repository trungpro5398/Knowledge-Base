import * as orgMembershipsRepo from "./organization-memberships.repo.js";
import * as organizationsRepo from "./organizations.repo.js";
import { invalidateSpacesForUser } from "../spaces/spaces-user-cache.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../../utils/errors.js";

// Cache invalidation for organizations - we'll need to create this
function invalidateOrganizationsForUser(userId: string): void {
  // TODO: Implement if we add org cache later
}

export async function listOrganizationMembers(organizationId: string, userId: string) {
  // Check if user is admin/owner of the organization
  const role = await organizationsRepo.getUserRoleInOrganization(userId, organizationId);
  if (role !== "admin" && role !== "owner") {
    throw new ForbiddenError("Chỉ admin/owner mới được xem danh sách members");
  }
  return orgMembershipsRepo.getOrganizationMemberships(organizationId);
}

export async function addOrganizationMember(
  organizationId: string,
  targetUserId: string,
  role: "member" | "admin" | "owner",
  adminUserId: string
) {
  // Check if admin user is admin/owner of the organization
  const adminRole = await organizationsRepo.getUserRoleInOrganization(adminUserId, organizationId);
  if (adminRole !== "admin" && adminRole !== "owner") {
    throw new ForbiddenError("Chỉ admin/owner mới được thêm members");
  }

  // Only owner can add other owners
  if (role === "owner" && adminRole !== "owner") {
    throw new ForbiddenError("Chỉ owner mới được thêm owner khác");
  }

  // Prevent removing last owner
  if (role !== "owner") {
    const members = await orgMembershipsRepo.getOrganizationMemberships(organizationId);
    const ownerCount = members.filter((m) => m.role === "owner").length;
    if (ownerCount === 1 && members.some((m) => m.user_id === targetUserId && m.role === "owner")) {
      throw new ValidationError("Không thể xóa owner cuối cùng của organization");
    }
  }

  const membership = await orgMembershipsRepo.addOrganizationMembership(organizationId, targetUserId, role);
  // Invalidate cache for the new member so they see the organization and its spaces immediately
  invalidateSpacesForUser(targetUserId);
  invalidateOrganizationsForUser(targetUserId);
  return membership;
}

export async function updateOrganizationMemberRole(
  organizationId: string,
  targetUserId: string,
  role: "member" | "admin" | "owner",
  adminUserId: string
) {
  // Check if admin user is admin/owner of the organization
  const adminRole = await organizationsRepo.getUserRoleInOrganization(adminUserId, organizationId);
  if (adminRole !== "admin" && adminRole !== "owner") {
    throw new ForbiddenError("Chỉ admin/owner mới được sửa role của members");
  }

  // Only owner can promote to owner
  if (role === "owner" && adminRole !== "owner") {
    throw new ForbiddenError("Chỉ owner mới được promote user thành owner");
  }

  // Prevent removing last owner
  if (role !== "owner") {
    const members = await orgMembershipsRepo.getOrganizationMemberships(organizationId);
    const ownerCount = members.filter((m) => m.role === "owner").length;
    if (ownerCount === 1 && members.some((m) => m.user_id === targetUserId && m.role === "owner")) {
      throw new ValidationError("Không thể xóa owner cuối cùng của organization");
    }
  }

  const membership = await orgMembershipsRepo.updateOrganizationMembershipRole(
    organizationId,
    targetUserId,
    role
  );
  // Invalidate cache for the updated member
  invalidateSpacesForUser(targetUserId);
  invalidateOrganizationsForUser(targetUserId);
  return membership;
}

export async function removeOrganizationMember(
  organizationId: string,
  targetUserId: string,
  adminUserId: string
) {
  // Check if admin user is admin/owner of the organization
  const adminRole = await organizationsRepo.getUserRoleInOrganization(adminUserId, organizationId);
  if (adminRole !== "admin" && adminRole !== "owner") {
    throw new ForbiddenError("Chỉ admin/owner mới được xóa members");
  }

  // Prevent removing last owner
  const members = await orgMembershipsRepo.getOrganizationMemberships(organizationId);
  const ownerCount = members.filter((m) => m.role === "owner").length;
  const targetMember = members.find((m) => m.user_id === targetUserId);
  if (targetMember?.role === "owner" && ownerCount === 1) {
    throw new ValidationError("Không thể xóa owner cuối cùng của organization");
  }

  await orgMembershipsRepo.removeOrganizationMembership(organizationId, targetUserId);
  // Invalidate cache for the removed member so they don't see the organization/spaces anymore
  invalidateSpacesForUser(targetUserId);
  invalidateOrganizationsForUser(targetUserId);
}
