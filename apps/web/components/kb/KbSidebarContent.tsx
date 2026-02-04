"use client";

import Link from "next/link";
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
      {/* Không gian - danh sách các kho tài liệu */}
      {spaces.length > 0 && (
        <div className="px-3 pt-4 pb-2">
          <p className="text-[11px] font-medium text-muted-foreground mb-2 px-1">
            Không gian
          </p>
          <div className="space-y-0.5">
            {spaces.map((space) => (
              <Link
                key={space.id}
                href={`/kb/${space.slug}`}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm transition-colors",
                  "hover:bg-muted/60",
                  space.slug === spaceSlug
                    ? "bg-primary/10 text-primary"
                    : "text-foreground"
                )}
              >
                <span className="font-medium truncate block">{space.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono truncate block">
                  /kb/{space.slug}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Phân cách */}
      {spaces.length > 0 && (
        <div className="mx-3 h-px bg-border/50" aria-hidden="true" />
      )}

      {/* Tìm kiếm + Cây trang */}
      <div className="flex-1 min-h-0 pt-3 pb-4 px-3">
        <p className="text-[11px] font-medium text-muted-foreground mb-2 px-1">
          Trang trong kho
        </p>
        <SidebarSearchFilter
          spaceSlug={spaceSlug}
          nodes={tree}
          showEditLink={false}
          className="h-[calc(100%-1.5rem)] flex flex-col"
        />
      </div>
    </nav>
  );
}
