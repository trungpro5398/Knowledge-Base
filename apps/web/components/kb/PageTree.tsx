"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Pencil, FolderOpen, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
  titles: readonly string[];
}

interface PageTreeProps {
  spaceId: string;
  spaceSlug: string;
  nodes: TreeNode[];
  showEditLink?: boolean;
  isLoading?: boolean;
  showCreateLink?: boolean;
  /** When set (e.g. tet-prosys), sidebar renders as collapsible groups */
  groupConfig?: readonly SidebarGroupConfig[];
  /**
   * Determines where page links navigate to:
   * - "kb" (default): public KB routes (/kb/[spaceSlug]/...)
   * - "admin": admin editor routes (/admin/spaces/[spaceId]/pages/[pageId]/edit)
   */
  linkMode?: "kb" | "admin";
}

function TreeNodeItem({
  node,
  spaceId,
  spaceSlug,
  path,
  showEditLink,
  linkMode,
  activePageId,
}: {
  node: TreeNode;
  spaceId: string;
  spaceSlug: string;
  path: string[];
  showEditLink: boolean;
  linkMode: "kb" | "admin";
  activePageId?: string | null;
}) {
  const href =
    linkMode === "admin"
      ? `/admin/spaces/${spaceId}/${node.id}`
      : `/kb/${spaceSlug}/${path.join("/")}`;
  const editHref = `/admin/spaces/${spaceId}/pages/${node.id}/edit`;
  const isActive = linkMode === "admin" && activePageId === node.id;
  
  return (
    <li className="border-l border-border pl-4 py-2 first:pt-0">
      <div className={`flex items-center gap-2 group ${isActive ? "bg-primary/10 rounded-md px-2 py-1 -ml-2" : ""}`}>
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <Link
          href={href}
          className={`text-sm font-medium transition-colors flex-1 truncate ${
            isActive
              ? "text-primary font-semibold"
              : "hover:text-primary"
          }`}
          prefetch={true}
        >
          {node.title}
        </Link>
        {/* Chỉ hiện nút edit riêng khi đang ở chế độ KB (public) và có quyền edit */}
        {showEditLink && linkMode === "kb" && (
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
              linkMode={linkMode}
              activePageId={activePageId}
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

export function PageTree({
  spaceId,
  spaceSlug,
  nodes,
  showEditLink = true,
  isLoading = false,
  showCreateLink = false,
  groupConfig,
  linkMode = "kb",
}: PageTreeProps) {
  const pathname = usePathname();
  // Extract active pageId from URL if in admin mode
  const activePageId =
    linkMode === "admin" && pathname
      ? pathname.match(/\/admin\/spaces\/[^/]+\/([^/]+)$/)?.[1] ?? null
      : null;

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-6 w-3/4 ml-4" />
        <Skeleton className="h-6 w-2/3 ml-8" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-6 w-4/5 ml-4" />
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="py-8 text-center">
        <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
        <p className="text-sm text-muted-foreground mb-2">Chưa có trang nào.</p>
        <p className="text-xs text-muted-foreground">Tạo trang mới trong Admin để bắt đầu.</p>
        {showCreateLink && linkMode === "admin" && (
          <div className="mt-4">
            <Link
              href={`/admin/spaces/${spaceId}/pages/new`}
              className="btn-primary h-8 px-3 text-xs gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Tạo trang
            </Link>
          </div>
        )}
      </div>
    );
  }

  const createLink =
    showCreateLink && linkMode === "admin" ? (
      <div className="mb-3">
        <Link
          href={`/admin/spaces/${spaceId}/pages/new`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
          Tạo trang mới
        </Link>
      </div>
    ) : null;

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
        {createLink}
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
                    linkMode={linkMode}
                    activePageId={activePageId}
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
                  linkMode={linkMode}
                  activePageId={activePageId}
                />
              ))}
            </ul>
          </details>
        )}
      </div>
    );
  }

  return (
    <div>
      {createLink}
      <ul className="space-y-1">
        {nodes.map((node) => (
          <TreeNodeItem
            key={node.id}
            node={node}
            spaceId={spaceId}
            spaceSlug={spaceSlug}
            path={[node.slug]}
            showEditLink={showEditLink}
            linkMode={linkMode}
            activePageId={activePageId}
          />
        ))}
      </ul>
    </div>
  );
}
