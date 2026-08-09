"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CircleUserRound, Search, LogIn, Settings, LogOut, Keyboard } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
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
  if (pathname.startsWith("/admin") || pathname === "/login" || pathname === "/register") return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur print:hidden supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-14 items-center justify-between gap-2 px-3 sm:px-4 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-foreground transition-colors"
        >
          <BrandLogo priority className="h-7 w-[100px] sm:h-10 sm:w-[178px]" />
          <span className="sr-only">{t("header.title")}</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("kb:open-search"))}
            onPointerEnter={() => window.dispatchEvent(new Event("kb:preload-search"))}
            onFocus={() => window.dispatchEvent(new Event("kb:preload-search"))}
            className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:min-w-0 sm:px-3"
            aria-label={t("header.searchDocs")}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t("header.searchDocs")}</span>
          </button>
          {isLoggedIn ? (
            <>
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:hidden"
                    aria-label={t("header.accountMenu")}
                  >
                    <CircleUserRound className="h-4 w-4" aria-hidden="true" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={8}
                    className="z-[70] min-w-44 overflow-hidden rounded-xl border bg-card p-1.5 text-card-foreground shadow-xl animate-fade-in"
                  >
                    <DropdownMenu.Label className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                      {t("header.accountMenu")}
                    </DropdownMenu.Label>
                    <DropdownMenu.Item asChild>
                      <Link
                        href="/admin"
                        className="flex min-h-10 items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors hover:bg-muted focus:bg-muted data-[highlighted]:bg-muted"
                      >
                        <Settings className="h-4 w-4 text-brand-orange" aria-hidden="true" />
                        {t("common.admin")}
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="my-1 h-px bg-border" />
                    <form action={signOutAction}>
                      <DropdownMenu.Item asChild>
                        <button
                          type="submit"
                          className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-normal text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus:bg-muted data-[highlighted]:bg-muted"
                        >
                          <LogOut className="h-4 w-4" aria-hidden="true" />
                          {t("header.logout")}
                        </button>
                      </DropdownMenu.Item>
                    </form>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
              <Link
                href="/admin"
                className="hidden min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-brand-orange transition-colors hover:bg-brand-orange/10 sm:flex sm:min-w-0 sm:px-3"
                aria-label="Admin"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
              <form action={signOutAction} className="hidden sm:inline">
                <button
                type="submit"
                className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:min-w-0 sm:px-3"
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
                className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:min-w-0 sm:px-3"
                aria-label={t("header.login")}
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t("header.login")}</span>
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="hidden p-2 rounded-md text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:inline-flex"
            aria-label={t("header.shortcuts")}
            title={t("header.shortcutsTitle")}
          >
            <Keyboard className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="max-[319px]:hidden">
            <LocaleToggle />
          </div>
          <div className="max-[425px]:hidden">
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
