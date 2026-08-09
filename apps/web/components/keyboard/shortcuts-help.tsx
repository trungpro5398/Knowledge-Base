"use client";

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { X, Command } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";
import { useShortcuts } from "./shortcuts-provider";

export function ShortcutsHelp() {
  const { t } = useLocale();
  const { shortcuts, showHelp, setShowHelp } = useShortcuts();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showHelp) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [showHelp]);

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex]:not([tabindex="-1"])')
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setShowHelp(false);
      }}
    >
      <div
        ref={dialogRef}
        className="bg-card border rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col overscroll-contain"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Command className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="shortcuts-title" className="text-lg font-semibold">{t("shortcuts.title")}</h2>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={() => setShowHelp(false)}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            aria-label={t("shortcuts.close")}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {Object.keys(grouped).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t("shortcuts.showHelp")}
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([category, categoryShortcuts]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {categoryShortcuts[0]?.categoryKey
                      ? t(categoryShortcuts[0].categoryKey as Parameters<typeof t>[0])
                      : category}
                  </h3>
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm">
                          {shortcut.descriptionKey ? t(shortcut.descriptionKey as Parameters<typeof t>[0]) : shortcut.description}
                        </span>
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
            {t("shortcuts.hint")}
          </p>
        </div>
      </div>
    </div>
  );
}
