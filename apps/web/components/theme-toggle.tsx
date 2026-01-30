"use client";

import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-1 rounded hover:bg-muted text-sm"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
