"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { SidebarSearchFilter } from "./SidebarSearchFilter";
import type { TreeNode } from "./PageTree";
import type { Space } from "@/lib/api/types";
import { useLocale } from "@/lib/i18n/locale-provider";

interface MobileSidebarProps {
  spaceId: string;
  spaceSlug: string;
  nodes: TreeNode[];
  spaces?: Space[];
}

export function MobileSidebar({
  spaceId,
  spaceSlug,
  nodes,
  spaces = [],
}: MobileSidebarProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (focusable.length === 0) return;

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <button
        type="button"
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
            aria-label="Đóng danh mục"
          />
          <div
            id="kb-mobile-sidebar"
            ref={dialogRef}
            className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-card border-r z-50 md:hidden overflow-auto overscroll-contain animate-slide-in-left"
            role="dialog"
            aria-modal="true"
            aria-labelledby="kb-mobile-sidebar-title"
            tabIndex={-1}
            onKeyDown={handleDialogKeyDown}
          >
            <div className="sticky top-0 bg-card border-b px-4 py-3 flex items-center justify-between">
              <h2 id="kb-mobile-sidebar-title" className="font-semibold">Danh mục</h2>
              <button
                type="button"
                ref={closeButtonRef}
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
                aria-label="Đóng danh mục"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                <span>Đóng</span>
              </button>
            </div>
            <div
              className="space-y-4 p-4"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("a")) setOpen(false);
              }}
            >
              {spaces.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("sidebar.spaces")}
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
                        <span className="text-[10px] text-muted-foreground truncate">
                          {space.organization_name || t("viewer.standaloneLabel")}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              <SidebarSearchFilter
                spaceSlug={spaceSlug}
                nodes={nodes}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
