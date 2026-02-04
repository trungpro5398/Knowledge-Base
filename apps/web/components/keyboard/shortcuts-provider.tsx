"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  description: string;
  action?: () => void;
  category: string;
}

interface ShortcutsContextType {
  shortcuts: Shortcut[];
  registerShortcut: (shortcut: Shortcut) => void;
  unregisterShortcut: (key: string) => void;
  showHelp: boolean;
  setShowHelp: (show: boolean) => void;
}

const ShortcutsContext = createContext<ShortcutsContextType | undefined>(undefined);

export function useShortcuts() {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error("useShortcuts must be used within ShortcutsProvider");
  }
  return context;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { key: "k", meta: true, description: "Mở command palette", category: "Chung" },
  { key: "\\", meta: true, description: "Thu gọn / mở sidebar", category: "Chung" },
  { key: "?", description: "Xem danh sách phím tắt", category: "Chung" },
];

interface ShortcutsProviderProps {
  children: ReactNode;
}

export function ShortcutsProvider({ children }: ShortcutsProviderProps) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const allShortcuts = [...DEFAULT_SHORTCUTS, ...shortcuts];

  const registerShortcut = (shortcut: Shortcut) => {
    setShortcuts((prev) => [...prev.filter((s) => s.key !== shortcut.key), shortcut]);
  };

  const unregisterShortcut = (key: string) => {
    setShortcuts((prev) => prev.filter((s) => s.key !== key));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show help modal with ?
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        // Don't trigger if typing in input/textarea
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // Close help with Escape
      if (e.key === "Escape" && showHelp) {
        setShowHelp(false);
        return;
      }

      // Match shortcuts (only those with action)
      for (const shortcut of shortcuts.filter((s) => s.action)) {
        const metaMatch = shortcut.meta ? (e.metaKey || e.ctrlKey) : true;
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : true;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        
        if (e.key.toLowerCase() === shortcut.key.toLowerCase() && metaMatch && ctrlMatch && shiftMatch && shortcut.action) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, showHelp]);

  return (
    <ShortcutsContext.Provider
      value={{ shortcuts: allShortcuts, registerShortcut, unregisterShortcut, showHelp, setShowHelp }}
    >
      {children}
    </ShortcutsContext.Provider>
  );
}
