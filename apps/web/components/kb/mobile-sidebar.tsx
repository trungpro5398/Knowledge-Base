"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { PageTree, type TreeNode, type SidebarGroupConfig } from "./PageTree";

interface MobileSidebarProps {
  spaceId: string;
  spaceSlug: string;
  nodes: TreeNode[];
  showEditLink?: boolean;
  groupConfig?: readonly SidebarGroupConfig[];
}

export function MobileSidebar({
  spaceId,
  spaceSlug,
  nodes,
  showEditLink = false,
  groupConfig,
}: MobileSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-40 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />
          <div
            className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-card border-r z-50 md:hidden overflow-auto overscroll-contain"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <div className="sticky top-0 bg-card border-b px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold">Navigation</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-md hover:bg-muted"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <PageTree
                spaceId={spaceId}
                spaceSlug={spaceSlug}
                nodes={nodes}
                showEditLink={showEditLink}
                groupConfig={groupConfig}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
