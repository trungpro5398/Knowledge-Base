"use client";

import { useState, useEffect, useRef } from "react";
import { PanelLeftClose, PanelRightOpen, GripVertical } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "sidebar-collapsed:";
const WIDTH_PREFIX = "sidebar-width:";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 420;

interface CollapsibleSidebarProps {
  children: React.ReactNode;
  /** localStorage key for persisting state */
  storageKey: string;
  /** Enable drag-to-resize (persists width to localStorage) */
  resizable?: boolean;
  /** Width when expanded, e.g. "w-60" - used only when resizable=false */
  expandedWidth?: string;
  /** Additional classes for the aside */
  className?: string;
  /** Responsive visibility, e.g. "hidden md:flex" */
  responsive?: string;
}

export function CollapsibleSidebar({
  children,
  storageKey,
  resizable = false,
  expandedWidth = "w-64",
  className,
  responsive = "hidden md:flex",
}: CollapsibleSidebarProps) {
  const { t } = useLocale();
  const collapsedKey = `${STORAGE_PREFIX}${storageKey}`;
  const widthKey = `${WIDTH_PREFIX}${storageKey}`;

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(collapsedKey);
      if (stored !== null) setIsCollapsed(stored === "true");
      if (resizable) {
        const w = localStorage.getItem(widthKey);
        if (w) {
          const n = parseInt(w, 10);
          if (!isNaN(n) && n >= MIN_WIDTH && n <= MAX_WIDTH) setWidth(n);
        }
      }
    } catch {
      /* ignore */
    }
  }, [collapsedKey, widthKey, resizable]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(collapsedKey, String(isCollapsed));
    } catch {
      /* ignore */
    }
  }, [mounted, collapsedKey, isCollapsed]);

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

  const latestWidthRef = useRef(width);
  latestWidthRef.current = width;

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startW = width;

    const onMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startW + delta));
      setWidth(next);
    };
    const onUp = () => {
      setIsResizing(false);
      try {
        localStorage.setItem(widthKey, String(latestWidthRef.current));
      } catch {}
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const currentWidth = isCollapsed ? 44 : resizable ? width : undefined;
  const widthClass = !resizable && !isCollapsed ? expandedWidth : undefined;

  return (
    <div
      className={cn(
        responsive,
        "flex shrink-0 items-stretch",
        resizable && "min-w-0"
      )}
    >
      <aside
        style={currentWidth !== undefined ? { width: currentWidth } : undefined}
        className={cn(
          "overflow-hidden flex flex-col transition-[width] duration-200 ease-in-out",
          "bg-card/95 dark:bg-card/95 border-r border-border/50",
          !widthClass && "shrink-0",
          widthClass,
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
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
            aria-label={t("sidebar.expand")}
            title={`${t("sidebar.expand")} (Ctrl+\\)`}
            >
              <PanelRightOpen className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full min-w-0">
            <div className="flex items-center justify-between shrink-0 px-3 py-2.5 border-b border-border/40">
              <span className="text-xs font-medium text-muted-foreground">
                {t("sidebar.menu")}
              </span>
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                aria-label={t("sidebar.collapse")}
                title={`${t("sidebar.collapse")} (Ctrl+\\)`}
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

      {/* Resize handle */}
      {resizable && !isCollapsed && (
        <div
          onMouseDown={handleResizeStart}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              setWidth((w) => {
                const next = Math.max(MIN_WIDTH, w - 12);
                try {
                  localStorage.setItem(widthKey, String(next));
                } catch {}
                return next;
              });
            }
            if (e.key === "ArrowRight") {
              e.preventDefault();
              setWidth((w) => {
                const next = Math.min(MAX_WIDTH, w + 12);
                try {
                  localStorage.setItem(widthKey, String(next));
                } catch {}
                return next;
              });
            }
          }}
          role="separator"
          aria-orientation="vertical"
          aria-label={t("sidebar.resize")}
          tabIndex={0}
          className={cn(
            "w-1.5 shrink-0 cursor-col-resize flex items-center justify-center",
            "hover:bg-primary/20 active:bg-primary/30 transition-colors",
            "group",
            isResizing && "bg-primary/25"
          )}
        >
          <GripVertical
            className={cn(
              "h-4 w-4 text-muted-foreground/50 group-hover:text-primary/60",
              isResizing && "text-primary/70"
            )}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}
