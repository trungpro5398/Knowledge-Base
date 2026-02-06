"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { PageTree, type TreeNode } from "./PageTree";
import { useLocale } from "@/lib/i18n/locale-provider";
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
  const { t } = useLocale();
  const [query, setQuery] = useState("");

  const filteredNodes = useMemo(() => filterTree(nodes, query), [nodes, query]);
  const hasQuery = query.trim().length > 0;

  return (
    <div className={cn("space-y-3 flex flex-col min-h-0", className)}>
      <div className="relative shrink-0">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground shrink-0"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder={t("sidebar.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input-no-native-clear w-full h-8 pl-8 pr-7 rounded-md bg-muted/40 text-sm placeholder:text-muted-foreground/80 border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-muted/60 transition-colors"
          aria-label="Tìm kiếm trong danh mục"
        />
        {hasQuery && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Xóa tìm kiếm"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        <PageTree
          spaceId=""
          spaceSlug={spaceSlug}
          nodes={filteredNodes}
          showEditLink={showEditLink}
        />
        {hasQuery && filteredNodes.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t("common.noResults")}
          </p>
        )}
      </div>
    </div>
  );
}
