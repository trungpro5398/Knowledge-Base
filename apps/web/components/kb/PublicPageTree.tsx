"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, FileText } from "lucide-react";
import type { TreeNode } from "./PageTree";
import { useLocale } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";

function PublicTreeNode({
  node,
  spaceSlug,
  path,
  activePath,
  collapsedIds,
  expandAll,
  onToggle,
  expandLabel,
  collapseLabel,
}: {
  node: TreeNode;
  spaceSlug: string;
  path: string[];
  activePath: string | null;
  collapsedIds: Set<string>;
  expandAll: boolean;
  onToggle: (id: string) => void;
  expandLabel: string;
  collapseLabel: string;
}) {
  const activeLinkRef = useRef<HTMLAnchorElement>(null);
  const pagePath = path.join("/");
  const isActive = activePath === pagePath;
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isExpanded = expandAll || !collapsedIds.has(node.id);

  useEffect(() => {
    if (isActive) activeLinkRef.current?.scrollIntoView({ block: "nearest" });
  }, [isActive]);

  return (
    <li className="ml-2 border-l border-border/50 py-1 pl-3 first:pt-0">
      <div className="-ml-px flex min-w-0 items-center gap-0.5">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? collapseLabel : expandLabel}: ${node.title}`}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md p-0 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <ChevronRight
              className={cn("h-3.5 w-3.5 transition-transform motion-reduce:transition-none", isExpanded && "rotate-90")}
              aria-hidden="true"
            />
          </button>
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center" aria-hidden="true">
            <FileText className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
          </span>
        )}
        <Link
          ref={activeLinkRef}
          href={`/kb/${spaceSlug}/${pagePath}`}
          prefetch={false}
          aria-current={isActive ? "page" : undefined}
          title={node.title}
          className={cn(
            "group min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            isActive
              ? "bg-primary/10 font-medium text-primary"
              : "text-foreground/90 hover:bg-muted/50 hover:text-foreground"
          )}
        >
          {node.title}
        </Link>
      </div>
      {hasChildren && isExpanded ? (
        <ul className="ml-1 mt-0.5 space-y-0">
          {node.children!.map((child) => (
            <PublicTreeNode
              key={child.id}
              node={child}
              spaceSlug={spaceSlug}
              path={[...path, child.slug]}
              activePath={activePath}
              collapsedIds={collapsedIds}
              expandAll={expandAll}
              onToggle={onToggle}
              expandLabel={expandLabel}
              collapseLabel={collapseLabel}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Public-only tree: keeps admin drag-and-drop code out of the reader bundle. */
export function PublicPageTree({
  spaceSlug,
  nodes,
  expandAll = false,
}: {
  spaceSlug: string;
  nodes: TreeNode[];
  expandAll?: boolean;
}) {
  const { t } = useLocale();
  const pathname = usePathname();
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const activePath = useMemo(() => {
    if (!pathname) return null;
    const prefix = `/kb/${spaceSlug}`;
    if (!pathname.startsWith(prefix)) return null;
    const rest = pathname.slice(prefix.length).replace(/^\/+/, "");
    return rest ? rest.split("/").map(decodeURIComponent).join("/") : "";
  }, [pathname, spaceSlug]);

  const activeBranchIds = useMemo(() => {
    const ids = new Set<string>();
    const visit = (items: TreeNode[], parentPath: string[] = []) => {
      for (const node of items) {
        const nodePath = [...parentPath, node.slug];
        const pagePath = nodePath.join("/");
        if (activePath === pagePath || activePath?.startsWith(`${pagePath}/`)) {
          ids.add(node.id);
          visit(node.children ?? [], nodePath);
        }
      }
    };
    visit(nodes);
    return ids;
  }, [activePath, nodes]);

  useEffect(() => {
    setCollapsedIds((current) => {
      if (activeBranchIds.size === 0) return current;
      const next = new Set(current);
      for (const id of activeBranchIds) next.delete(id);
      return next.size === current.size ? current : next;
    });
  }, [activeBranchIds]);

  useEffect(() => {
    setCollapsedIds(new Set());
  }, [spaceSlug]);

  const toggleNode = (id: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <ul className="space-y-1">
      {nodes.map((node) => (
        <PublicTreeNode
          key={node.id}
          node={node}
          spaceSlug={spaceSlug}
          path={[node.slug]}
          activePath={activePath}
          collapsedIds={collapsedIds}
          expandAll={expandAll}
          onToggle={toggleNode}
          expandLabel={t("sidebar.expandSection")}
          collapseLabel={t("sidebar.collapseSection")}
        />
      ))}
    </ul>
  );
}
