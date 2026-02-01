const RECENT_PAGES_KEY = "kb_recent_pages";
const MAX_RECENT = 10;

export interface RecentPage {
  id: string;
  title: string;
  path: string;
}

export function getRecentPages(): RecentPage[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_PAGES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addRecentPage(page: RecentPage): void {
  if (typeof window === "undefined") return;
  try {
    const recent = getRecentPages();
    const filtered = recent.filter((p) => p.id !== page.id);
    const updated = [page, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save recent page", e);
  }
}

export function clearRecentPages(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RECENT_PAGES_KEY);
}
