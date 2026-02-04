"use client";

import { useLocale } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5"
      role="group"
      aria-label="Chọn ngôn ngữ"
    >
      <button
        type="button"
        onClick={() => setLocale("vi")}
        className={cn(
          "rounded-md px-2 py-1 text-xs font-medium transition-colors",
          locale === "vi"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={locale === "vi"}
        aria-label="Tiếng Việt"
      >
        VI
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={cn(
          "rounded-md px-2 py-1 text-xs font-medium transition-colors",
          locale === "en"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={locale === "en"}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
