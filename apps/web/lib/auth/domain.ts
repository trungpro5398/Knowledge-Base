export const TET_EMAIL_DOMAIN = "tet-edu.com";

export function isAllowedTetEmail(email?: string | null): boolean {
  const normalized = email?.trim().toLowerCase() ?? "";
  const atIndex = normalized.lastIndexOf("@");
  return atIndex > 0 && normalized.slice(atIndex + 1) === TET_EMAIL_DOMAIN;
}
