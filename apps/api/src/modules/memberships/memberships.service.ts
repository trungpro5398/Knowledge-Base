import * as membershipsRepo from "./memberships.repo.js";
import * as spacesRepo from "../spaces/spaces.repo.js";
import * as organizationsRepo from "../organizations/organizations.repo.js";
import { invalidateSpacesForUser } from "../spaces/spaces-user-cache.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../../utils/errors.js";

export async function listMembers(spaceId: string, userId: string) {
  // Check if user is admin of the space
  const role = await spacesRepo.getMemberRole(spaceId, userId);
  if (role !== "admin") {
    throw new ForbiddenError("Chỉ admin mới được xem danh sách members");
  }
  return membershipsRepo.getMembershipsBySpace(spaceId);
}

export async function addMember(
  spaceId: string,
  targetUserId: string,
  role: "viewer" | "editor" | "admin",
  adminUserId: string
) {
  // Check if admin user is admin of the space
  const adminRole = await spacesRepo.getMemberRole(spaceId, adminUserId);
  if (adminRole !== "admin") {
    throw new ForbiddenError("Chỉ admin mới được thêm members");
  }

  // Prevent removing last admin
  if (role !== "admin") {
    const members = await membershipsRepo.getMembershipsBySpace(spaceId);
    const adminCount = members.filter((m) => m.role === "admin").length;
    if (adminCount === 1 && members.some((m) => m.user_id === targetUserId && m.role === "admin")) {
      throw new ValidationError("Không thể xóa admin cuối cùng của space");
    }
  }

  const membership = await membershipsRepo.addMembership(spaceId, targetUserId, role);
  // Invalidate cache for the new member so they see the space immediately
  invalidateSpacesForUser(targetUserId);
  // Also invalidate cache for admin user in case they're viewing the list
  invalidateSpacesForUser(adminUserId);
  return membership;
}

export async function updateMemberRole(
  spaceId: string,
  targetUserId: string,
  role: "viewer" | "editor" | "admin",
  adminUserId: string
) {
  // Check if admin user is admin of the space
  const adminRole = await spacesRepo.getMemberRole(spaceId, adminUserId);
  if (adminRole !== "admin") {
    throw new ForbiddenError("Chỉ admin mới được sửa role của members");
  }

  // Prevent removing last admin
  if (role !== "admin") {
    const members = await membershipsRepo.getMembershipsBySpace(spaceId);
    const adminCount = members.filter((m) => m.role === "admin").length;
    if (adminCount === 1 && members.some((m) => m.user_id === targetUserId && m.role === "admin")) {
      throw new ValidationError("Không thể xóa admin cuối cùng của space");
    }
  }

  const membership = await membershipsRepo.updateMembershipRole(spaceId, targetUserId, role);
  // Invalidate cache for the updated member
  invalidateSpacesForUser(targetUserId);
  return membership;
}

export async function removeMember(spaceId: string, targetUserId: string, adminUserId: string) {
  // Check if admin user is admin of the space
  const adminRole = await spacesRepo.getMemberRole(spaceId, adminUserId);
  if (adminRole !== "admin") {
    throw new ForbiddenError("Chỉ admin mới được xóa members");
  }

  // Prevent removing last admin
  const members = await membershipsRepo.getMembershipsBySpace(spaceId);
  const adminCount = members.filter((m) => m.role === "admin").length;
  const targetMember = members.find((m) => m.user_id === targetUserId);
  if (targetMember?.role === "admin" && adminCount === 1) {
    throw new ValidationError("Không thể xóa admin cuối cùng của space");
  }

  await membershipsRepo.removeMembership(spaceId, targetUserId);
  // Invalidate cache for the removed member so they don't see the space anymore
  invalidateSpacesForUser(targetUserId);
}

interface SearchUsersInput {
  q?: string;
  limit?: number;
  organizationId?: string;
  spaceId?: string;
  pageId?: string;
}

export async function searchUsers(input: SearchUsersInput, requesterUserId: string) {
  const query = (input.q ?? "").trim();
  const limit = input.limit ?? 20;
  const hasContext = Boolean(input.organizationId || input.spaceId || input.pageId);

  // Keep old anti-enumeration behavior when caller has no specific context.
  if (!hasContext && query.length < 2) {
    return [];
  }

  if (input.organizationId) {
    const role = await organizationsRepo.getUserRoleInOrganization(requesterUserId, input.organizationId);
    if (role !== "admin" && role !== "owner") {
      throw new ForbiddenError("Chỉ admin/owner mới được tìm user để thêm vào organization");
    }
  }

  if (input.spaceId) {
    const role = await spacesRepo.getMemberRole(input.spaceId, requesterUserId);
    if (role !== "admin") {
      throw new ForbiddenError("Chỉ admin mới được tìm user để thêm vào space");
    }
  }

  return membershipsRepo.searchUsers({
    query,
    limit,
    organizationId: input.organizationId,
    spaceId: input.spaceId,
    pageId: input.pageId,
  });
}

export async function getUserByEmail(email: string) {
  const user = await membershipsRepo.getUserByEmail(email);
  if (!user) {
    throw new NotFoundError("User không tồn tại");
  }
  return user;
}
