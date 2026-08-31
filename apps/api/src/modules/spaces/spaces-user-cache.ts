import * as spacesRepo from "./spaces.repo.js";

export async function getSpacesForUserCached(userId: string) {
  return spacesRepo.listSpacesForUser(userId);
}

export async function getSpacesStatsCached(userId: string) {
  return spacesRepo.getSpacesStats(userId);
}

export function invalidateSpacesForUser(_userId: string): void {
  // Authorization-sensitive reads intentionally bypass process-local caches.
  // Vercel instances cannot invalidate each other's memory reliably.
}
