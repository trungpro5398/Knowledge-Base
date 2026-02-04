"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { useLocale } from "@/lib/i18n/locale-provider";

export function AdminLogoutButton({
  variant = "sidebar",
}: {
  variant?: "sidebar" | "mobile";
}) {
  const { t } = useLocale();

  if (variant === "mobile") {
    return (
      <form action={signOut} className="contents">
        <button
          type="submit"
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          aria-label={t("header.logout")}
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          <span className="text-xs">{t("header.logout")}</span>
        </button>
      </form>
    );
  }

  return (
    <form action={signOut} className="block">
      <button
        type="submit"
        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
        aria-label={t("header.logout")}
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {t("header.logout")}
      </button>
    </form>
  );
}
