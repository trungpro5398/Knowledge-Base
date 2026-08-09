import * as spacesRepo from "./spaces.repo.js";
import * as organizationsRepo from "../organizations/organizations.repo.js";
import { getPublicSpacesCached, invalidatePublishedSpace } from "../public/public-cache.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../../utils/errors.js";
import { getSpaceBySlugCached, invalidateSpaceCache } from "./spaces-cache.js";
import { getSpacesForUserCached, getSpacesStatsCached, invalidateSpacesForUser } from "./spaces-user-cache.js";

export async function listSpaces(userId: string) {
  return getSpacesForUserCached(userId);
}

export async function listPublicSpaces() {
  return getPublicSpacesCached();
}

export async function getSpacesStats(userId: string) {
  return getSpacesStatsCached(userId);
}

export async function getSpaceBySlug(slug: string) {
  return getSpaceBySlugCached(slug);
}

export async function getSpace(id: string, userId: string) {
  const space = await spacesRepo.getSpaceForUser(id, userId);
  if (!space) throw new NotFoundError("Space not found");
  return space;
}

export async function deleteSpace(spaceId: string, userId: string) {
  const space = await spacesRepo.getSpaceForUser(spaceId, userId);
  if (!space) throw new NotFoundError("Space not found");
  const role = await spacesRepo.getMemberRole(spaceId, userId);
  if (role !== "admin") {
    throw new (await import("../../utils/errors.js")).ForbiddenError(
      "Chỉ admin mới được xóa space"
    );
  }
  await spacesRepo.deleteSpace(spaceId);
  invalidateSpaceCache(spaceId, space.slug);
  invalidatePublishedSpace(spaceId);
  invalidateSpacesForUser(userId);
}

export async function createSpace(
  data: { name: string; slug: string; icon?: string | null; description?: string | null; organization_id?: string | null },
  userId: string
) {
  if (data.organization_id) {
    const role = await organizationsRepo.getUserRoleInOrganization(userId, data.organization_id);
    if (role !== "admin" && role !== "owner") {
      throw new ForbiddenError("Chỉ admin/owner của organization mới được tạo space");
    }
  }

  const existing = await spacesRepo.getSpaceBySlug(data.slug);
  if (existing) throw new ValidationError("Space slug already exists");

  const space = await spacesRepo.createSpace({
    ...data,
    createdBy: userId,
  });

  invalidateSpaceCache(space.id, space.slug);
  invalidateSpacesForUser(userId);
  return space;
}

export async function updateSpace(
  spaceId: string,
  data: { name: string; slug: string; description?: string | null },
  userId: string
) {
  const current = await spacesRepo.getSpaceForUser(spaceId, userId);
  if (!current) throw new NotFoundError("Space not found");

  const role = await spacesRepo.getMemberRole(spaceId, userId);
  if (role !== "admin") {
    throw new ForbiddenError("Chỉ admin mới được chỉnh sửa kho tài liệu");
  }

  const existing = await spacesRepo.getSpaceBySlug(data.slug);
  if (existing && existing.id !== spaceId) {
    throw new ValidationError("Space slug already exists");
  }

  const updated = await spacesRepo.updateSpace(spaceId, data);
  invalidateSpaceCache(spaceId, current.slug);
  invalidateSpaceCache(spaceId, updated.slug);
  invalidatePublishedSpace(spaceId);
  invalidateSpacesForUser(userId);
  return updated;
}
