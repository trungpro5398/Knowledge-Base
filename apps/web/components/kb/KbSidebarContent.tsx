"use client";

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
  return (
    <nav className="flex flex-col h-full">
      {/* Danh sách các kho tài liệu */}
      {spaces.length > 0 && (
        <div className="px-3 pt-4 pb-2">
          <PublicSpaceNavigator
            key={spaceSlug}
            spaces={spaces}
            activeSpaceSlug={spaceSlug}
          />
        </div>
      )}

      {/* Phân cách */}
      {spaces.length > 0 && (
        <div className="mx-3 h-px bg-border/50" aria-hidden="true" />
      )}

      {/* Tìm kiếm + Cây trang */}
      <div className="flex-1 min-h-0 pt-3 pb-4 px-3">
        <p className="text-[11px] font-medium text-muted-foreground mb-2 px-1">
          {t("sidebar.pagesInSpace")}
        </p>
        <SidebarSearchFilter
          spaceSlug={spaceSlug}
          nodes={tree}
          className="flex-1 min-h-0 flex flex-col"
        />
      </div>
    </nav>
  );
}
