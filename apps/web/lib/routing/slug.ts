export function slugToPath(slugSegments: string[]): string {
  return slugSegments.join(".");
}

export function pathToSlug(path: string): string[] {
  return path.split(".").filter(Boolean);
}
