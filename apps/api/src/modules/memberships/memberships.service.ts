import * as membershipsRepo from "./memberships.repo.js";
import { invalidateSpacesForUser } from "../spaces/spaces-user-cache.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../../utils/errors.js";

export async function listMembers(spaceId: string, userId: string) {
  const members = await membershipsRepo.getMembershipsForAdmin(spaceId, userId);
  if (!members) throw new NotFoundError("Space not found");
  return members;
}

export async function addMember(
  spaceId: string,
  targetUserId: string,
  role: "viewer" | "editor" | "admin",
  adminUserId: string
) {
  const result = await membershipsRepo.upsertMembershipForAdmin(
    spaceId,
    targetUserId,
    role,
    adminUserId
  );
  assertMembershipMutation(result.status, "thêm");
  // Invalidate cache for the new member so they see the space immediately
  invalidateSpacesForUser(targetUserId);
  // Also invalidate cache for admin user in case they're viewing the list
  invalidateSpacesForUser(adminUserId);
  return result.membership!;
}

export async function addMemberByEmail(
  spaceId: string,
  targetEmail: string,
  role: "viewer" | "editor" | "admin",
  adminUserId: string
) {
  const result = await membershipsRepo.upsertMembershipByEmailForAdmin(
    spaceId,
    targetEmail,
    role,
    adminUserId
  );
  assertMembershipMutation(result.status, "thêm");
  const targetUserId = result.membership!.user_id;
  invalidateSpacesForUser(targetUserId);
  invalidateSpacesForUser(adminUserId);
  return result.membership!;
}

export async function updateMemberRole(
  spaceId: string,
  targetUserId: string,
  role: "viewer" | "editor" | "admin",
  adminUserId: string
) {
  const result = await membershipsRepo.updateMembershipRoleForAdmin(
    spaceId,
    targetUserId,
    role,
    adminUserId
  );
  assertMembershipMutation(result.status, "sửa role của");
  // Invalidate cache for the updated member
  invalidateSpacesForUser(targetUserId);
  return result.membership!;
}

export async function removeMember(spaceId: string, targetUserId: string, adminUserId: string) {
  const status = await membershipsRepo.removeMembershipForAdmin(
    spaceId,
    targetUserId,
    adminUserId
  );
  assertMembershipMutation(status, "xóa");
  // Invalidate cache for the removed member so they don't see the space anymore
  invalidateSpacesForUser(targetUserId);
}

function assertMembershipMutation(
  status: membershipsRepo.MembershipMutationStatus,
  action: string
): void {
  if (status === "success") return;
  if (status === "space_not_found" || status === "member_not_found") {
    throw new NotFoundError("Space member not found");
  }
  if (status === "forbidden") {
    throw new ForbiddenError(`Chỉ admin mới được ${action} members`);
  }
  if (status === "invalid_action" || status === "invalid_role") {
    throw new ValidationError("Thao tác hoặc role không hợp lệ");
  }
  throw new ValidationError("Không thể xóa admin cuối cùng của space");
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

  // This endpoint returns data from auth.users and is only used by member
  // management UI. A free-text search without an admin-owned target lets any
  // authenticated user enumerate colleague names and email addresses.
  if (!hasContext) {
    throw new ForbiddenError("Cần context organization, space hoặc page để tìm user");
  }

  if (query.length < 2) {
    throw new ValidationError("Cần ít nhất 2 ký tự để tìm user");
  }

  const result = await membershipsRepo.searchUsersForAdmin(
    {
      query,
      limit,
      organizationId: input.organizationId,
      spaceId: input.spaceId,
      pageId: input.pageId,
    },
    requesterUserId
  );
  if (result.status === "page_not_found") {
    throw new NotFoundError("Page not found");
  }
  if (result.status === "organization_forbidden") {
    throw new ForbiddenError("Chỉ admin/owner mới được tìm user để thêm vào organization");
  }
  if (result.status === "space_forbidden") {
    throw new ForbiddenError("Chỉ admin mới được tìm user để thêm vào space");
  }
  if (result.status === "page_forbidden") {
    throw new ForbiddenError("Chỉ admin mới được tìm user theo page");
  }
  if (result.status === "forbidden") {
    throw new ForbiddenError("Cần context organization, space hoặc page để tìm user");
  }
  return result.users;
}
