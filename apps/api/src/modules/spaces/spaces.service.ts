import * as spacesRepo from "./spaces.repo.js";
import { NotFoundError, ValidationError } from "../../utils/errors.js";

export async function listSpaces(userId: string) {
  return spacesRepo.listSpacesForUser(userId);
}

export async function getSpaceBySlug(slug: string) {
  return spacesRepo.getSpaceBySlug(slug);
}

export async function getSpace(id: string, userId: string) {
  const space = await spacesRepo.getSpaceById(id);
  if (!space) throw new NotFoundError("Space not found");

  const membership = await spacesRepo.listSpacesForUser(userId);
  if (!membership.some((s) => s.id === id)) {
    throw new NotFoundError("Space not found");
  }
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
  return space;
}

async function addMember(spaceId: string, userId: string, role: string) {
  const { pool } = await import("../../db/pool.js");
  if (!pool) return;
  await pool.query(
    "INSERT INTO memberships (user_id, space_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
    [userId, spaceId, role]
  );
}
