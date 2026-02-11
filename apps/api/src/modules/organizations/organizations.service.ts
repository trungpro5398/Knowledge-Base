import * as organizationsRepo from "./organizations.repo.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../../utils/errors.js";

export async function listOrganizations(userId: string) {
  return organizationsRepo.listOrganizationsForUser(userId);
}

export async function getOrganization(id: string, userId: string) {
  const org = await organizationsRepo.getOrganizationById(id);
  if (!org) throw new NotFoundError("Organization not found");

  const role = await organizationsRepo.getUserRoleInOrganization(userId, id);
  if (!role) throw new NotFoundError("Organization not found");

  return org;
}

export async function getOrganizationBySlug(slug: string) {
  return organizationsRepo.getOrganizationBySlug(slug);
}

export async function createOrganization(
  data: { name: string; slug: string; icon?: string | null; description?: string | null },
  userId: string
) {
  const existing = await organizationsRepo.getOrganizationBySlug(data.slug);
  if (existing) throw new ValidationError("Organization slug already exists");

  return organizationsRepo.createOrganization({
    ...data,
    createdBy: userId,
  });
}

export async function getOrganizationSpaces(organizationId: string, userId: string) {
  // Verify user has access to org
  const role = await organizationsRepo.getUserRoleInOrganization(userId, organizationId);
  if (!role) throw new NotFoundError("Organization not found");

  return organizationsRepo.getSpacesByOrganization(organizationId);
}

export async function deleteOrganization(organizationId: string, userId: string) {
  const org = await organizationsRepo.getOrganizationById(organizationId);
  if (!org) throw new NotFoundError("Organization not found");

  const role = await organizationsRepo.getUserRoleInOrganization(userId, organizationId);
  if (role !== "owner") {
    throw new ForbiddenError("Chỉ owner mới được xóa organization");
  }

  await organizationsRepo.deleteOrganization(organizationId);
}
