export interface ContentHeading {
  id: string;
  text: string;
  level: number;
}

export function slugifyHeading(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

export function headingId(baseId: string, count: number): string {
  const suffix = count === 0 ? baseId : `${baseId}-${count + 1}`;
  return `user-content-${suffix}`;
}

export function extractMarkdownToc(content: string): ContentHeading[] {
  const counts = new Map<string, number>();
  const headings: ContentHeading[] = [];

  for (const line of content.split("\n")) {
    const match = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (!match) continue;

    const text = match[2]!.trim();
    const baseId = slugifyHeading(text);
    const count = counts.get(baseId) ?? 0;
    counts.set(baseId, count + 1);
    headings.push({
      id: headingId(baseId, count),
      text,
      level: match[1]!.length,
    });
  }

  return headings;
}
