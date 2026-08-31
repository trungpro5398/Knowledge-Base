export const MAX_PUBLIC_SEARCH_PAGE = 1_000;

export function parsePublicSearchPage(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  if (!Number.isSafeInteger(page)) return 1;
  return Math.min(MAX_PUBLIC_SEARCH_PAGE, Math.max(1, page));
}

export function isValidPublicSpaceSlug(value: string | undefined): value is string {
  return typeof value === "string" && /^[a-z0-9-]{1,50}$/.test(value);
}
