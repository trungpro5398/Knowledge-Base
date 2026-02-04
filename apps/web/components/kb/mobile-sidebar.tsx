"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { SidebarSearchFilter } from "./SidebarSearchFilter";
import type { TreeNode } from "./PageTree";
import type { Space } from "@/lib/api/types";

interface MobileSidebarProps {
  spaceId: string;
  spaceSlug: string;
  nodes: TreeNode[];
  showEditLink?: boolean;
  spaces?: Space[];
}

export function MobileSidebar({
  spaceId,
  spaceSlug,
  nodes,
  showEditLink = false,
  spaces = [],
}: MobileSidebarProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-40 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
        aria-label="Mở danh mục"
        aria-expanded={open}
        aria-controls="kb-mobile-sidebar"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
        <span className="text-sm font-medium">Danh mục</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/50 z-50 md:hidden animate-fade-in"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />
          <div
            id="kb-mobile-sidebar"
            className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-card border-r z-50 md:hidden overflow-auto overscroll-contain animate-slide-in-left"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <div className="sticky top-0 bg-card border-b px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold">Danh mục</h2>
              <button
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
                aria-label="Đóng danh mục"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                <span>Đóng</span>
              </button>
            </div>
            <div className="p-4 space-y-4">
              {spaces.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Spaces
                  </p>
                  <div className="space-y-1">
                    {spaces.map((space) => (
                      <Link
                        key={space.id}
                        href={`/kb/${space.slug}`}
                        className={`flex min-w-0 flex-col gap-0.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60 ${
                          space.slug === spaceSlug ? "bg-primary/10 text-primary" : ""
                        }`}
                      >
                        <span className="font-medium truncate">{space.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          /kb/{space.slug}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              <SidebarSearchFilter
                spaceSlug={spaceSlug}
                nodes={nodes}
                showEditLink={showEditLink}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
