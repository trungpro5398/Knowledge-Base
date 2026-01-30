"use client";

import Link from "next/link";

export interface TreeNode {
  id: string;
  title: string;
  slug: string;
  children?: TreeNode[];
}

interface PageTreeProps {
  spaceId: string;
  spaceSlug: string;
  nodes: TreeNode[];
}

function TreeNodeItem({ node, spaceId, spaceSlug, path }: {
  node: TreeNode;
  spaceId: string;
  spaceSlug: string;
  path: string[];
}) {
  const href = `/kb/${spaceSlug}/${path.join("/")}`;
  const editHref = `/admin/spaces/${spaceId}/pages/${node.id}/edit`;
  return (
    <li className="ml-4">
      <div className="flex items-center gap-2 py-1">
        <Link href={href} className="hover:underline">
          {node.title}
        </Link>
        <Link
          href={editHref}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Edit
        </Link>
      </div>
      {(node.children?.length ?? 0) > 0 && (
        <ul>
          {(node.children ?? []).map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              spaceId={spaceId}
              spaceSlug={spaceSlug}
              path={[...path, child.slug]}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function PageTree({ spaceId, spaceSlug, nodes }: PageTreeProps) {
  return (
    <ul>
      {nodes.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          spaceId={spaceId}
          spaceSlug={spaceSlug}
          path={[node.slug]}
        />
      ))}
    </ul>
  );
}
