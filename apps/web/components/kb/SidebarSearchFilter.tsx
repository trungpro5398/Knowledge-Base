"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { TreeNode } from "./PageTree";
import { PublicPageTree } from "./PublicPageTree";
import { useLocale } from "@/lib/i18n/locale-provider";
import { normalizeSpaceSearch } from "@/lib/kb/space-groups";
import { cn } from "@/lib/utils";

interface SidebarSearchFilterProps {
  spaceSlug: string;
  nodes: TreeNode[];
  className?: string;
}

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  const q = normalizeSpaceSearch(query.trim());
  if (!q) return nodes;

  function matches(node: TreeNode): boolean {
    return normalizeSpaceSearch(node.title).includes(q);
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
          name="page-filter"
          autoComplete="off"
          placeholder={t("sidebar.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input-no-native-clear h-8 w-full rounded-md border-0 bg-muted/40 pl-8 pr-7 text-sm placeholder:text-muted-foreground/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:bg-muted/60"
          aria-label={t("sidebar.searchPagesLabel")}
        />
        {hasQuery ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label={t("sidebar.clearPageSearch")}
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        <PublicPageTree spaceSlug={spaceSlug} nodes={filteredNodes} />
        {hasQuery && filteredNodes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t("common.noResults")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
