import * as organizationsRepo from "./organizations.repo.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../../utils/errors.js";

export async function getAdminDashboard(userId: string) {
  return organizationsRepo.getAdminDashboard(userId);
}

export async function getOrganizationBootstrap(
  organizationId: string,
  userId: string,
  includeMembers: boolean
) {
  const bootstrap = await organizationsRepo.getOrganizationBootstrap(
    organizationId,
    userId,
    includeMembers
  );
  if (!bootstrap) throw new NotFoundError("Organization not found");
  return bootstrap;
}

export async function listOrganizations(userId: string) {
  return organizationsRepo.listOrganizationsForUser(userId);
}

export async function getOrganization(id: string, userId: string) {
  const org = await organizationsRepo.getOrganizationForUser(id, userId);
  if (!org) throw new NotFoundError("Organization not found");
  return org;
}

export async function getOrganizationBySlug(slug: string) {
  return organizationsRepo.getOrganizationBySlug(slug);
}

export async function createOrganization(
  data: { name: string; slug: string; icon?: string | null; description?: string | null },
  userId: string
) {
  const result = await organizationsRepo.createOrganization({
    ...data,
    createdBy: userId,
  });
  if (result.status === "slug_conflict") {
    throw new ValidationError("Organization slug already exists");
  }
  if (result.status !== "success" || !result.organization) {
    throw new Error(`Unexpected organization creation result: ${result.status}`);
  }
  return result.organization;
}

export async function createOrganizationWithInitialSpace(
  data: { name: string; slug: string; icon?: string | null; description?: string | null },
  userId: string
) {
  const result = await organizationsRepo.createOrganizationWithInitialSpace({
    ...data,
    createdBy: userId,
  });
  if (result.status === "slug_conflict") {
    throw new ValidationError("Organization slug already exists");
  }
  if (result.status !== "success" || !result.organization || !result.space) {
    throw new Error(`Unexpected organization creation result: ${result.status}`);
  }
  return { organization: result.organization, space: result.space };
}

export async function getOrganizationSpaces(organizationId: string, userId: string) {
  const spaces = await organizationsRepo.getSpacesByOrganizationForUser(
    organizationId,
    userId
  );
  if (!spaces) throw new NotFoundError("Organization not found");
  return spaces;
}

export async function deleteOrganization(organizationId: string, userId: string) {
  const result = await organizationsRepo.deleteOrganization(organizationId, userId);
  if (result.status === "organization_not_found") {
    throw new NotFoundError("Organization not found");
  }
  if (result.status === "forbidden") {
    throw new ForbiddenError("Chỉ owner mới được xóa organization");
  }
  if (result.status !== "success") {
    throw new Error(`Unexpected organization deletion result: ${result.status}`);
  }
}
