"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Search, LogIn, UserPlus, Settings, LogOut, Keyboard } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleToggle } from "@/components/locale-toggle";
import { useShortcuts } from "@/components/keyboard/shortcuts-provider";
import { useLocale } from "@/lib/i18n/locale-provider";

type SignOutAction = () => Promise<void>;

export function SiteHeader({
  isLoggedIn,
  signOutAction,
}: {
  isLoggedIn: boolean;
  signOutAction: SignOutAction;
}) {
  const { t } = useLocale();
  const { setShowHelp } = useShortcuts();
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/admin")) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors"
        >
          <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="hidden sm:inline">{t("header.title")}</span>
          <span className="sm:hidden">{t("header.titleShort")}</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/kb/tet-prosys"
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label={t("header.viewDocs")}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t("header.viewDocs")}</span>
          </Link>
          {isLoggedIn ? (
            <>
              <Link
                href="/admin"
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                aria-label="Admin"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
              <form action={signOutAction} className="inline">
                <button
                type="submit"
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label={t("header.logout")}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t("header.logout")}</span>
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label={t("header.login")}
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t("header.login")}</span>
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 rounded-md px-2 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title={t("header.registerTitle")}
                aria-label={t("header.register")}
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden md:inline text-xs">{t("header.register")}</span>
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label={t("header.shortcuts")}
            title={t("header.shortcutsTitle")}
          >
            <Keyboard className="h-4 w-4" aria-hidden="true" />
          </button>
          <LocaleToggle />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
