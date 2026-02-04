"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

export function Toaster() {
  const { theme } = useTheme();

  return (
    <div aria-live="polite" aria-atomic="true">
      <Sonner
        theme={theme as "light" | "dark" | "system"}
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "rounded-lg border shadow-lg",
            title: "text-sm font-medium",
            description: "text-sm text-muted-foreground",
            actionButton: "btn-primary text-xs",
            cancelButton: "text-xs",
            error: "border-destructive text-destructive",
            success: "border-primary text-primary",
            warning: "border-amber-500 text-amber-600",
            info: "border-blue-500 text-blue-600",
          },
        }}
      />
    </div>
  );
}
