"use client";

import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { SidebarSearchFilter } from "./SidebarSearchFilter";
import type { TreeNode } from "./PageTree";
import type { Space } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface KbSidebarContentProps {
  spaces: Space[];
  spaceSlug: string;
  tree: TreeNode[];
}

export function KbSidebarContent({
  spaces,
  spaceSlug,
  tree,
}: KbSidebarContentProps) {
  return (
    <nav className="flex flex-col h-full">
      {/* Spaces section */}
      {spaces.length > 0 && (
        <div className="px-3 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <FolderKanban
              className="h-3.5 w-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Spaces
            </span>
          </div>
          <div className="space-y-0.5">
            {spaces.map((space) => (
              <Link
                key={space.id}
                href={`/kb/${space.slug}`}
                className={cn(
                  "flex min-w-0 flex-col gap-0.5 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                  "hover:bg-muted/70",
                  space.slug === spaceSlug
                    ? "bg-primary/10 text-primary ring-1 ring-primary/15"
                    : "text-foreground/90"
                )}
              >
                <span className="font-medium truncate">{space.name}</span>
                <span
                  className={cn(
                    "text-[10px] font-mono truncate",
                    space.slug === spaceSlug
                      ? "text-primary/80"
                      : "text-muted-foreground"
                  )}
                >
                  /kb/{space.slug}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      {spaces.length > 0 && (
        <div className="mx-3 h-px bg-border/60" aria-hidden="true" />
      )}

      {/* Search + Page tree */}
      <div className="flex-1 min-h-0 pt-3 pb-4 px-3">
        <SidebarSearchFilter
          spaceSlug={spaceSlug}
          nodes={tree}
          showEditLink={false}
          className="h-full flex flex-col"
        />
      </div>
    </nav>
  );
}
