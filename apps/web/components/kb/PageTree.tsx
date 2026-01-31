"use client";

import Link from "next/link";
import { FileText, Pencil } from "lucide-react";

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
  showEditLink?: boolean;
}

function TreeNodeItem({
  node,
  spaceId,
  spaceSlug,
  path,
  showEditLink,
}: {
  node: TreeNode;
  spaceId: string;
  spaceSlug: string;
  path: string[];
  showEditLink: boolean;
}) {
  const href = `/kb/${spaceSlug}/${path.join("/")}`;
  const editHref = `/admin/spaces/${spaceId}/pages/${node.id}/edit`;
  return (
    <li className="border-l border-border pl-4 py-2 first:pt-0">
      <div className="flex items-center gap-2 group">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <Link
          href={href}
          className="text-sm font-medium hover:text-primary transition-colors flex-1 truncate"
        >
          {node.title}
        </Link>
        {showEditLink && (
          <Link
            href={editHref}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            title="Chỉnh sửa"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {(node.children?.length ?? 0) > 0 && (
        <ul className="mt-2 ml-2 space-y-1">
          {(node.children ?? []).map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              spaceId={spaceId}
              spaceSlug={spaceSlug}
              path={[...path, child.slug]}
              showEditLink={showEditLink}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function PageTree({ spaceId, spaceSlug, nodes, showEditLink = true }: PageTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        Chưa có trang nào. Tạo trang mới để bắt đầu.
      </div>
    );
  }
  return (
    <ul className="space-y-1">
      {nodes.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          spaceId={spaceId}
          spaceSlug={spaceSlug}
          path={[node.slug]}
          showEditLink={showEditLink}
        />
      ))}
    </ul>
  );
}
