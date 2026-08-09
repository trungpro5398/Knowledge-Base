import type { Space } from "@/lib/api/types";

export interface PublicSpaceGroup {
  key: string;
  name: string;
  spaces: Space[];
  isActive: boolean;
}

export function normalizeSpaceSearch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLocaleLowerCase();
}

export function groupPublicSpaces(
  spaces: Space[],
  options: { locale: string; standaloneLabel: string; activeSpaceSlug?: string }
): PublicSpaceGroup[] {
  const grouped = new Map<string, PublicSpaceGroup>();
  const collator = new Intl.Collator(options.locale, { sensitivity: "base" });

  for (const space of spaces) {
    const organizationName = space.organization_name?.trim() || options.standaloneLabel;
    const key = space.organization_id
      ? `organization:${space.organization_id}`
      : `organization-name:${normalizeSpaceSearch(organizationName)}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.spaces.push(space);
      existing.isActive ||= space.slug === options.activeSpaceSlug;
    } else {
      grouped.set(key, {
        key,
        name: organizationName,
        spaces: [space],
        isActive: space.slug === options.activeSpaceSlug,
      });
    }
  }

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      spaces: group.spaces.toSorted((a, b) => collator.compare(a.name, b.name)),
    }))
    .toSorted(
      (a, b) =>
        Number(b.isActive) - Number(a.isActive) || collator.compare(a.name, b.name)
    );
}

export function filterPublicSpaceGroups(
  groups: PublicSpaceGroup[],
  query: string
): PublicSpaceGroup[] {
  const normalizedQuery = normalizeSpaceSearch(query.trim());
  if (!normalizedQuery) return groups;

  return groups.flatMap((group) => {
    const organizationMatches = normalizeSpaceSearch(group.name).includes(normalizedQuery);
    const matchingSpaces = organizationMatches
      ? group.spaces
      : group.spaces.filter((space) => {
          const searchable = `${space.name} ${space.description ?? ""}`;
          return normalizeSpaceSearch(searchable).includes(normalizedQuery);
        });
    return matchingSpaces.length > 0 ? [{ ...group, spaces: matchingSpaces }] : [];
  });
}
