"use client";

import Link from "next/link";
import { PageTree, type TreeNode } from "@/components/kb/PageTree";
import { TET_PROSYS_GROUPS } from "@/lib/kb/sidebar-groups";
import { useLocale } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type { Space } from "@/lib/api/types";

interface SpaceSidebarContentProps {
  spaceId: string;
  space: Space;
  tree: TreeNode[];
  spaces: Space[];
  useGroupedSidebar?: boolean;
  enableDragAndDrop?: boolean;
}

export function SpaceSidebarContent({
  spaceId,
  space,
  tree,
  spaces,
  useGroupedSidebar = false,
  enableDragAndDrop = true,
}: SpaceSidebarContentProps) {
  const { t } = useLocale();

  return (
    <>
      <div className="p-4 border-b border-border/70">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("sidebar.spaces")}
          </span>
          <Link
            href="/admin"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("admin.create")}
          </Link>
        </div>
        <div className="mt-3 space-y-1">
          {spaces.map((item) => (
            <Link
              key={item.id}
              href={`/admin/spaces/${item.id}`}
              className={cn(
                "flex flex-col gap-0.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/60",
                item.id === space.id && "bg-primary/10 text-primary"
              )}
            >
              <span className="font-medium truncate">{item.name}</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                /kb/{item.slug}
              </span>
            </Link>
          ))}
        </div>
      </div>
      <div className="p-4">
        <PageTree
          spaceId={spaceId}
          spaceSlug={space.slug}
          nodes={tree}
          linkMode="admin"
          showEditLink={false}
          showCreateLink
          showCreateChild
          enableDragAndDrop={enableDragAndDrop}
          groupConfig={!enableDragAndDrop && useGroupedSidebar ? TET_PROSYS_GROUPS : undefined}
        />
      </div>
    </>
  );
}
