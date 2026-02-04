"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { PageTree, type TreeNode } from "./PageTree";
import { cn } from "@/lib/utils";

interface SidebarSearchFilterProps {
  spaceSlug: string;
  nodes: TreeNode[];
  showEditLink?: boolean;
  className?: string;
}

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  function matches(node: TreeNode): boolean {
    return node.title.toLowerCase().includes(q);
  }

  function collect(n: TreeNode): TreeNode | null {
    if (matches(n)) {
      return { ...n, children: n.children ? n.children.flatMap((c) => collect(c) ?? []).filter(Boolean) as TreeNode[] : undefined };
    }
    const filteredChildren = (n.children ?? []).flatMap((c) => collect(c) ?? []).filter(Boolean) as TreeNode[];
    if (filteredChildren.length > 0) {
      return { ...n, children: filteredChildren };
    }
    return null;
  }

  return nodes.flatMap((n) => collect(n) ?? []).filter(Boolean) as TreeNode[];
}

export function SidebarSearchFilter({
  spaceSlug,
  nodes,
  showEditLink = false,
  className,
}: SidebarSearchFilterProps) {
  const [query, setQuery] = useState("");

  const filteredNodes = useMemo(() => filterTree(nodes, query), [nodes, query]);
  const hasQuery = query.trim().length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <input
          type="search"
          placeholder="Tìm trong danh mục..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full h-9 pl-9 pr-8 rounded-lg border border-border bg-muted/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-shadow"
          aria-label="Tìm kiếm trong danh mục"
        />
        {hasQuery && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Xóa tìm kiếm"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="space-y-1 stagger-list">
        <PageTree
          spaceId=""
          spaceSlug={spaceSlug}
          nodes={filteredNodes}
          showEditLink={showEditLink}
          staggerAnimation
        />
        {hasQuery && filteredNodes.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Không tìm thấy kết quả
          </p>
        )}
      </div>
    </div>
  );
}
