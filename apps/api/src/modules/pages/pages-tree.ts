import type { PageRow } from "./pages.repo.js";

type TreePage = Pick<PageRow, "id" | "parent_id" | "sort_order" | "path">;

export type PageNode<T extends TreePage = PageRow> = T & { children: PageNode<T>[] };

export function buildPagesTree<T extends TreePage>(pages: T[]): PageNode<T>[] {
  const childrenByParent = new Map<string | null, T[]>();
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

  const build = (parentId: string | null): PageNode<T>[] => {
    const children = childrenByParent.get(parentId) ?? [];
    return children.map((child) => ({
      ...child,
      children: build(child.id),
    }));
  };

  return build(null);
}
