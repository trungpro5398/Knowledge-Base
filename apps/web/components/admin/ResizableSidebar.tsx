"use client";

import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH_KEY = "kb-admin-sidebar-width";
const DEFAULT_WIDTH = 280; // pixels
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

interface ResizableSidebarProps {
    sidebar: ReactNode;
    children: ReactNode;
    defaultCollapsed?: boolean;
}

/**
 * ResizableSidebar - fallback version without external dependencies
 * 
 * For full functionality, install react-resizable-panels:
 *   pnpm add react-resizable-panels --filter web
 * 
 * This version provides basic resize via CSS and localStorage persistence.
 */
export function ResizableSidebar({
    sidebar,
    children,
    defaultCollapsed = false,
}: ResizableSidebarProps) {
    const [width, setWidth] = useState(DEFAULT_WIDTH);
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
    const [isResizing, setIsResizing] = useState(false);

    // Load saved width from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
        if (saved) {
            const parsed = parseInt(saved, 10);
            if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
                setWidth(parsed);
            }
        }
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);

        const startX = e.clientX;
        const startWidth = width;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const delta = moveEvent.clientX - startX;
            const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + delta));
            setWidth(newWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            localStorage.setItem(SIDEBAR_WIDTH_KEY, width.toString());
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside
                style={{ width: isCollapsed ? 0 : width }}
                className={cn(
                    "bg-card/50 border-r shrink-0 overflow-hidden transition-[width] duration-200",
                    isCollapsed && "border-r-0"
                )}
            >
                <div className="h-full overflow-y-auto overflow-x-hidden" style={{ width }}>
                    {sidebar}
                </div>
            </aside>

            {/* Resize Handle */}
            {!isCollapsed && (
                <div
                    onMouseDown={handleMouseDown}
                    className={cn(
                        "w-1.5 bg-transparent hover:bg-primary/20 cursor-col-resize transition-colors shrink-0",
                        isResizing && "bg-primary/30"
                    )}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 h-full overflow-auto">
                {children}
            </main>
        </div>
    );
}
