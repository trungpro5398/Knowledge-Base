import * as spacesRepo from "./spaces.repo.js";
import { NotFoundError, ValidationError } from "../../utils/errors.js";
import { pool } from "../../db/pool.js";
import { getSpaceBySlugCached, invalidateSpaceCache } from "./spaces-cache.js";
import { getSpacesForUserCached, getSpacesStatsCached, invalidateSpacesForUser } from "./spaces-user-cache.js";

export async function listSpaces(userId: string) {
  return getSpacesForUserCached(userId);
}

export async function listPublicSpaces() {
  return spacesRepo.listPublicSpaces();
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

export async function createSpace(
  data: { name: string; slug: string; icon?: string | null; description?: string | null },
  userId: string
) {
  const existing = await spacesRepo.getSpaceBySlug(data.slug);
  if (existing) throw new ValidationError("Space slug already exists");

  const space = await spacesRepo.createSpace({
    ...data,
    createdBy: userId,
  });

  await addMember(space.id, userId, "admin");
  invalidateSpaceCache(space.id, space.slug);
  invalidateSpacesForUser(userId);
  return space;
}

async function addMember(spaceId: string, userId: string, role: string) {
  if (!pool) return;
  await pool.query(
    "INSERT INTO memberships (user_id, space_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
    [userId, spaceId, role]
  );
}
