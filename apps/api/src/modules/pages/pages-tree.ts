import type { PageRow } from "./pages.repo.js";

export type PageNode = PageRow & { children: PageNode[] };

export function buildPagesTree(pages: PageRow[]): PageNode[] {
  const childrenByParent = new Map<string | null, PageRow[]>();
  for (const page of pages) {
    const key = page.parent_id ?? null;
    const list = childrenByParent.get(key);
    if (list) {
      list.push(page);
    } else {
      childrenByParent.set(key, [page]);
    }
  }

  for (const list of childrenByParent.values()) {
    list.sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        String(a.path).localeCompare(String(b.path))
    );
  }

  const build = (parentId: string | null): PageNode[] => {
    const children = childrenByParent.get(parentId) ?? [];
    return children.map((child) => ({
      ...child,
      children: build(child.id),
    }));
  };

  return build(null);
}
