"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { TreeNode } from "@/components/kb/PageTree";
import { useLocale } from "@/lib/i18n/locale-provider";

interface NavigationItem {
  title: string;
  path: string;
}

function flattenTree(nodes: TreeNode[], parentPath: string[] = []): NavigationItem[] {
  return nodes.flatMap((node) => {
    const path = [...parentPath, node.slug];
    return [
      { title: node.title, path: path.join("/") },
      ...flattenTree(node.children ?? [], path),
    ];
  });
}

export function PageNavigation({
  spaceSlug,
  tree,
  currentPath,
}: {
  spaceSlug: string;
  tree: TreeNode[];
  currentPath: string;
}) {
  const { t } = useLocale();
  const items = flattenTree(tree);
  const normalizedPath = currentPath.split(".").filter(Boolean).join("/");
  const currentIndex = items.findIndex((item) => item.path === normalizedPath);
  if (currentIndex < 0) return null;

  const previous = items[currentIndex - 1];
  const next = items[currentIndex + 1];
  if (!previous && !next) return null;

  return (
    <nav
      className="mt-12 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 border-t pt-6 sm:grid-cols-2"
      aria-label={t("kbNav.ariaLabel")}
    >
      {previous ? (
        <Link
          href={`/kb/${spaceSlug}/${previous.path}`}
          className="group min-w-0 rounded-xl border p-4 transition-colors hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {t("kbNav.previous")}
          </span>
          <span className="mt-2 block truncate font-medium group-hover:text-primary">{previous.title}</span>
        </Link>
      ) : <span aria-hidden="true" />}
      {next ? (
        <Link
          href={`/kb/${spaceSlug}/${next.path}`}
          className="group min-w-0 rounded-xl border p-4 text-right transition-colors hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <span className="flex items-center justify-end gap-2 text-xs font-medium text-muted-foreground">
            {t("kbNav.next")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="mt-2 block truncate font-medium group-hover:text-primary">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}
