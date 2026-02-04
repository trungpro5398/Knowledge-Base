import type { Page, PageNode } from "@/lib/api/types";

type PageLike = Pick<Page, "id" | "title" | "slug" | "parent_id" | "path" | "status">;

export function insertPageIntoTree(nodes: PageNode[], page: PageLike): PageNode[] {
  const newNode: PageNode = {
    id: page.id,
    title: page.title,
    slug: page.slug,
    path: page.path || page.slug,
    parent_id: page.parent_id ?? null,
    status: page.status,
    children: [],
  };

  if (!page.parent_id) {
    return [...nodes, newNode];
  }

  let inserted = false;
  const next = nodes.map((node) => {
    if (node.id === page.parent_id) {
      inserted = true;
      const children = node.children ? [...node.children, newNode] : [newNode];
      return { ...node, children };
    }
    if (node.children && node.children.length > 0) {
      const updatedChildren = insertPageIntoTree(node.children, page);
      if (updatedChildren !== node.children) {
        return { ...node, children: updatedChildren };
      }
    }
    return node;
  });

  if (!inserted) {
    return [...nodes, newNode];
  }

  return next;
}
