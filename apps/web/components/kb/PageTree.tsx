"use client";

import Link from "next/link";
import { FileText, Pencil, FolderOpen } from "lucide-react";

export interface TreeNode {
  id: string;
  title: string;
  slug: string;
  children?: TreeNode[];
}

export interface SidebarGroupConfig {
  id: string;
  label: string;
  icon: string;
  titles: string[];
}

interface PageTreeProps {
  spaceId: string;
  spaceSlug: string;
  nodes: TreeNode[];
  showEditLink?: boolean;
  /** When set (e.g. tet-prosys), sidebar renders as collapsible groups */
  groupConfig?: readonly SidebarGroupConfig[];
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

function getGroupId(title: string, config: readonly SidebarGroupConfig[]): string | null {
  for (const g of config) {
    if (g.titles.includes(title)) return g.id;
  }
  return null;
}

export function PageTree({ spaceId, spaceSlug, nodes, showEditLink = true, groupConfig }: PageTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="py-8 text-center">
        <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
        <p className="text-sm text-muted-foreground mb-2">Chưa có trang nào.</p>
        <p className="text-xs text-muted-foreground">Tạo trang mới trong Admin để bắt đầu.</p>
      </div>
    );
  }

  if (groupConfig && groupConfig.length > 0) {
    const byGroup = new Map<string | "other", TreeNode[]>();
    for (const node of nodes) {
      const gid = getGroupId(node.title, groupConfig);
      const key = gid ?? "other";
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(node);
    }
    return (
      <div className="space-y-1">
        {groupConfig.map((g) => {
          const groupNodes = byGroup.get(g.id) ?? [];
          if (groupNodes.length === 0) return null;
          return (
            <details
              key={g.id}
              className="group/details rounded-lg border border-border/80 overflow-hidden"
              open={g.id === "getting-started"}
            >
              <summary className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground cursor-pointer list-none hover:bg-muted/50 hover:text-foreground [&::-webkit-details-marker]:hidden">
                <span className="group-open/details:rotate-90 transition-transform">{g.icon}</span>
                <span>{g.label}</span>
              </summary>
              <ul className="border-t border-border/80 py-2 space-y-0">
                {groupNodes.map((node) => (
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
            </details>
          );
        })}
        {(byGroup.get("other")?.length ?? 0) > 0 && (
          <details className="group/details rounded-lg border border-border/80 overflow-hidden">
            <summary className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground cursor-pointer list-none hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
              Khác
            </summary>
            <ul className="border-t border-border/80 py-2 space-y-0">
              {byGroup.get("other")!.map((node) => (
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
          </details>
        )}
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
