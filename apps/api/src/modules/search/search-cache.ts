import * as searchRepo from "./search.repo.js";

export async function searchCached(params: {
  userId: string;
  q?: string;
  spaceId?: string;
  labelIds?: string[];
  status?: string;
  limit: number;
  offset: number;
}) {
  // Query combinations have a low repeat rate and authorization can change
  // on another instance, so a local TTL cache costs memory without providing
  // reliable invalidation.
  return searchRepo.search(params);
}
