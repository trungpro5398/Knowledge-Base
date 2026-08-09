"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText } from "lucide-react";
import type { TreeNode } from "./PageTree";
import { cn } from "@/lib/utils";

function PublicTreeNode({
  node,
  spaceSlug,
  path,
  activePath,
}: {
  node: TreeNode;
  spaceSlug: string;
  path: string[];
  activePath: string | null;
}) {
  const pagePath = path.join("/");
  const isActive = activePath === pagePath;

  return (
    <li className="ml-2 border-l border-border/50 py-1 pl-3 first:pt-0">
      <Link
        href={`/kb/${spaceSlug}/${pagePath}`}
        prefetch={false}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "group -ml-px flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          isActive
            ? "bg-primary/10 font-medium text-primary"
            : "text-foreground/90 hover:bg-muted/50 hover:text-foreground"
        )}
      >
        <FileText
          className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")}
          aria-hidden="true"
        />
        <span className="min-w-0 truncate">{node.title}</span>
      </Link>
      {(node.children?.length ?? 0) > 0 ? (
        <ul className="ml-1 mt-0.5 space-y-0">
          {node.children!.map((child) => (
            <PublicTreeNode
              key={child.id}
              node={child}
              spaceSlug={spaceSlug}
              path={[...path, child.slug]}
              activePath={activePath}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Public-only tree: keeps admin drag-and-drop code out of the reader bundle. */
export function PublicPageTree({ spaceSlug, nodes }: { spaceSlug: string; nodes: TreeNode[] }) {
  const pathname = usePathname();
  const activePath = useMemo(() => {
    if (!pathname) return null;
    const prefix = `/kb/${spaceSlug}`;
    if (!pathname.startsWith(prefix)) return null;
    const rest = pathname.slice(prefix.length).replace(/^\/+/, "");
    return rest ? rest.split("/").map(decodeURIComponent).join("/") : "";
  }, [pathname, spaceSlug]);

  return (
    <ul className="space-y-1">
      {nodes.map((node) => (
        <PublicTreeNode
          key={node.id}
          node={node}
          spaceSlug={spaceSlug}
          path={[node.slug]}
          activePath={activePath}
        />
      ))}
    </ul>
  );
}
