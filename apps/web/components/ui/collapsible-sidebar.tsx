"use client";

import { useState, useEffect } from "react";
import { PanelLeftClose, PanelRightOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "sidebar-collapsed:";

interface CollapsibleSidebarProps {
  children: React.ReactNode;
  /** localStorage key for persisting state */
  storageKey: string;
  /** Width when expanded, e.g. "w-60" or "w-72" */
  expandedWidth?: string;
  /** Additional classes for the aside */
  className?: string;
  /** Responsive visibility, e.g. "hidden md:flex" */
  responsive?: string;
}

export function CollapsibleSidebar({
  children,
  storageKey,
  expandedWidth = "w-60",
  className,
  responsive = "hidden md:flex",
}: CollapsibleSidebarProps) {
  const key = `${STORAGE_PREFIX}${storageKey}`;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setIsCollapsed(stored === "true");
    } catch {
      /* ignore */
    }
  }, [key]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(key, String(isCollapsed));
    } catch {
      /* ignore */
    }
  }, [mounted, key, isCollapsed]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <aside
      className={cn(
        responsive,
        "shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out border-r border-border/50 flex flex-col",
        isCollapsed ? "w-12" : expandedWidth,
        className
      )}
      aria-expanded={!isCollapsed}
      role="complementary"
    >
      {isCollapsed ? (
        <div className="flex flex-col items-center py-4 flex-1">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Mở sidebar"
            title="Mở sidebar"
          >
            <PanelRightOpen className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col h-full min-w-0">
          <div className="flex items-center justify-end shrink-0 p-2 border-b border-border/50">
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Ẩn sidebar"
              title="Ẩn sidebar"
            >
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
            {children}
          </div>
        </div>
      )}
    </aside>
  );
}
