"use client";

import { X, Command } from "lucide-react";
import { useShortcuts } from "./shortcuts-provider";

export function ShortcutsHelp() {
  const { shortcuts, showHelp, setShowHelp } = useShortcuts();

  if (!showHelp) return null;

  // Group shortcuts by category
  const grouped = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  const formatKey = (shortcut: typeof shortcuts[0]) => {
    const parts: string[] = [];
    if (shortcut.meta) parts.push("⌘");
    if (shortcut.ctrl) parts.push("Ctrl");
    if (shortcut.shift) parts.push("⇧");
    parts.push(shortcut.key.toUpperCase());
    return parts.join(" + ");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      <div
        className="bg-card border rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col overscroll-contain"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Command className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="shortcuts-title" className="text-lg font-semibold">Keyboard Shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowHelp(false)}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            aria-label="Close shortcuts help"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {Object.keys(grouped).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No shortcuts registered
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([category, categoryShortcuts]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm">{shortcut.description}</span>
                        <kbd className="px-2 py-1 text-xs font-mono bg-muted border rounded">
                          {formatKey(shortcut)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">?</kbd> to
            show this help • Press <kbd className="px-1.5 py-0.5 bg-background border rounded text-xs">Esc</kbd> to
            close
          </p>
        </div>
      </div>
    </div>
  );
}
