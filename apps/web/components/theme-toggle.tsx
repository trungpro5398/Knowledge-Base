"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? t("header.themeToLight") : t("header.themeToDark");

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="p-2 rounded-lg hover:bg-muted transition-colors"
      aria-label={label}
      title={label}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      )}
    </button>
  );
}
