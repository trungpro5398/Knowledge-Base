"use client";

import { useId } from "react";
import { Files } from "lucide-react";
import { SidebarSearchFilter } from "./SidebarSearchFilter";
import { PublicSpaceNavigator } from "./PublicSpaceNavigator";
import type { TreeNode } from "./PageTree";
import type { Space } from "@/lib/api/types";
import { useLocale } from "@/lib/i18n/locale-provider";

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
  const { t } = useLocale();
  const activeSpace = spaces.find((space) => space.slug === spaceSlug);
  const contentsHeadingId = useId();

  return (
    <nav className="flex h-full flex-col" aria-label={t("sidebar.menu")}>
      {/* Danh sách các kho tài liệu */}
      {spaces.length > 0 ? (
        <div className="px-3 pb-0 pt-4">
          <PublicSpaceNavigator
            key={spaceSlug}
            spaces={spaces}
            activeSpaceSlug={spaceSlug}
          />
        </div>
      ) : null}

      {spaces.length > 0 ? (
        <div className="ml-8 h-3 border-l-2 border-primary/20" aria-hidden="true" />
      ) : null}

      {/* Mục lục là nội dung con của kho đang mở */}
      <section
        className="mx-3 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-card/30"
        aria-labelledby={contentsHeadingId}
      >
        <div className="flex items-center gap-2.5 border-b border-border/50 px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Files className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id={contentsHeadingId} className="text-xs font-semibold text-foreground">
              {t("sidebar.pagesInSpace")}
            </h2>
            <p className="truncate text-[10px] text-muted-foreground" title={activeSpace?.name || spaceSlug}>
              {activeSpace?.name || spaceSlug}
            </p>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-2.5">
          <SidebarSearchFilter
            spaceSlug={spaceSlug}
            nodes={tree}
            className="flex min-h-0 flex-1 flex-col"
          />
        </div>
      </section>
    </nav>
  );
}
