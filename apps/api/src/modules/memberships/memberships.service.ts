import * as membershipsRepo from "./memberships.repo.js";
import * as spacesRepo from "../spaces/spaces.repo.js";
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

  return membershipsRepo.addMembership(spaceId, targetUserId, role);
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

  return membershipsRepo.updateMembershipRole(spaceId, targetUserId, role);
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
}

export async function searchUsers(query: string, limit = 10) {
  if (!query || query.trim().length < 2) {
    return [];
  }
  return membershipsRepo.searchUsers(query, limit);
}

export async function getUserByEmail(email: string) {
  const user = await membershipsRepo.getUserByEmail(email);
  if (!user) {
    throw new NotFoundError("User không tồn tại");
  }
  return user;
}
