import * as spacesRepo from "./spaces.repo.js";
import { getPublicSpacesCached, invalidatePublishedSpace } from "../public/public-cache.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../../utils/errors.js";
import { getSpaceBySlugCached, invalidateSpaceCache } from "./spaces-cache.js";
import { getSpacesForUserCached, getSpacesStatsCached, invalidateSpacesForUser } from "./spaces-user-cache.js";
import { buildPagesTree } from "../pages/pages-tree.js";

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

export async function getSpaceBootstrap(id: string, userId: string) {
  const bootstrap = await spacesRepo.getSpaceBootstrap(id, userId);
  if (!bootstrap) throw new NotFoundError("Space not found");
  return {
    space: bootstrap.space,
    role: bootstrap.role,
    tree: buildPagesTree(bootstrap.pages),
    spaces: bootstrap.spaces,
    organizations: bootstrap.organizations,
  };
}

export async function deleteSpace(spaceId: string, userId: string) {
  const result = await spacesRepo.mutateSpace({
    action: "delete",
    spaceId,
    actorUserId: userId,
  });
  if (result.status === "space_not_found") throw new NotFoundError("Space not found");
  if (result.status === "forbidden") {
    throw new ForbiddenError("Chỉ admin mới được xóa space");
  }
  if (result.status !== "success" || !result.space) {
    throw new Error(`Unexpected space deletion result: ${result.status}`);
  }
  const space = result.space;
  invalidateSpaceCache(spaceId, space.slug);
  invalidatePublishedSpace(spaceId);
  invalidateSpacesForUser(userId);
}

export async function createSpace(
  data: { name: string; slug: string; icon?: string | null; description?: string | null; organization_id?: string | null },
  userId: string
) {
  const result = await spacesRepo.mutateSpace({
    action: "create",
    name: data.name,
    slug: data.slug,
    icon: data.icon,
    description: data.description,
    organizationId: data.organization_id,
    actorUserId: userId,
  });
  if (result.status === "forbidden") {
    throw new ForbiddenError("Chỉ admin/owner của organization mới được tạo space");
  }
  if (result.status === "slug_conflict") {
    throw new ValidationError("Space slug already exists");
  }
  if (result.status !== "success" || !result.space) {
    throw new Error(`Unexpected space creation result: ${result.status}`);
  }
  const space = result.space;

  invalidateSpaceCache(space.id, space.slug);
  invalidateSpacesForUser(userId);
  return space;
}

export async function updateSpace(
  spaceId: string,
  data: { name: string; slug: string; description?: string | null },
  userId: string
) {
  const result = await spacesRepo.mutateSpace({
    action: "update",
    spaceId,
    name: data.name,
    slug: data.slug,
    description: data.description,
    actorUserId: userId,
  });
  if (result.status === "space_not_found") throw new NotFoundError("Space not found");
  if (result.status === "forbidden") {
    throw new ForbiddenError("Chỉ admin mới được chỉnh sửa kho tài liệu");
  }
  if (result.status === "slug_conflict") {
    throw new ValidationError("Space slug already exists");
  }
  if (result.status !== "success" || !result.space || !result.previous_slug) {
    throw new Error(`Unexpected space update result: ${result.status}`);
  }
  const updated = result.space;
  invalidateSpaceCache(spaceId, result.previous_slug);
  invalidateSpaceCache(spaceId, updated.slug);
  invalidatePublishedSpace(spaceId);
  invalidateSpacesForUser(userId);
  return updated;
}
