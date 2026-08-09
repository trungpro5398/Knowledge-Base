"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "cmdk";
import { Search, FileText, Home, Plus, Moon, Sun, Folder, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@radix-ui/react-dialog";
import { api } from "@/lib/api/client";
import type { ApiResponse, PaginatedResponse, SearchResult, Space } from "@/lib/api/types";
import { getRecentPages, addRecentPage } from "@/lib/recent-pages";
import { useLocale } from "@/lib/i18n/locale-provider";

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const { t } = useLocale();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [recentPages, setRecentPages] = useState<Array<{ id: string; title: string; path: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (open) {
      setRecentPages(getRecentPages());
      // Load spaces
      api
        .get<ApiResponse<Space[]>>("/api/spaces")
        .then((res) => setSpaces(res.data || []))
        .catch(() => setSpaces([]));
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        api
          .get<PaginatedResponse<SearchResult>>(
            `/api/search?q=${encodeURIComponent(searchQuery)}&limit=8`
          )
          .then((res) => {
            setSearchResults(res.data || []);
            setIsSearching(false);
          })
          .catch(() => {
            setSearchResults([]);
            setIsSearching(false);
          });
      }, 300);
      return () => {
        clearTimeout(timer);
        setIsSearching(false);
      };
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleSelect = useCallback(
    (callback: () => void) => {
      onOpenChange(false);
      callback();
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-fade-in" />
        <DialogContent className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-[61] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 overflow-hidden overscroll-contain focus:outline-none sm:top-[15vh]">
          <DialogTitle className="sr-only">{t("command.searchAria")}</DialogTitle>
          <DialogDescription className="sr-only">{t("command.placeholder")}</DialogDescription>
          <Command label={t("command.searchAria")} className="overflow-hidden rounded-xl border bg-card shadow-2xl">
        <CommandInput
          placeholder={t("command.placeholder")}
          value={searchQuery}
          onValueChange={setSearchQuery}
          aria-label={t("command.searchAria")}
        />
        <CommandList>
          {isSearching && searchQuery.trim().length > 1 ? (
            <div className="py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("command.searching")}
            </div>
          ) : (
            <CommandEmpty>{t("command.empty")}</CommandEmpty>
          )}

          {searchResults.length > 0 && !isSearching && (
            <>
              <CommandGroup heading={t("command.searchResults")}>
                {searchResults.map((result) => (
                  <CommandItem
                    key={result.id}
                    onSelect={() =>
                      handleSelect(() => {
                        addRecentPage({ id: result.id, title: result.title, path: `/admin/spaces/${result.space_id}/pages/${result.id}/edit` });
                        router.push(`/admin/spaces/${result.space_id}/pages/${result.id}/edit`);
                      })
                    }
                  >
                    <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
                    <span>{result.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {recentPages.length > 0 && searchQuery.trim() === "" && (
            <>
              <CommandGroup heading={t("command.recent")}>
                {recentPages.map((page) => (
                  <CommandItem
                    key={page.id}
                    onSelect={() => handleSelect(() => router.push(page.path))}
                  >
                    <FileText className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span>{page.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          <CommandGroup heading={t("command.actions")}>
            <CommandItem onSelect={() => handleSelect(() => router.push("/admin"))}>
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>{t("common.dashboard")}</span>
            </CommandItem>
            {spaces.length > 0 && (
              <CommandItem
                onSelect={() =>
                  handleSelect(() => router.push(`/admin/spaces/${spaces[0]!.id}/pages/new`))
                }
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>{t("command.newPage")}</span>
              </CommandItem>
            )}
            <CommandItem onSelect={() => handleSelect(() => router.push("/kb"))}>
              <Search className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>{t("command.viewKb")}</span>
            </CommandItem>
          </CommandGroup>

          {spaces.length > 0 && searchQuery.trim() === "" && (
            <>
              <CommandSeparator />
              <CommandGroup heading={t("sidebar.spaces")}>
                {spaces.map((space) => (
                  <CommandItem
                    key={space.id}
                    onSelect={() =>
                      handleSelect(() => router.push(`/admin/spaces/${space.id}/tree`))
                    }
                  >
                    <Folder className="mr-2 h-4 w-4 text-primary" aria-hidden="true" />
                    <span>{space.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />
          <CommandGroup heading={t("command.theme")}>
            <CommandItem onSelect={() => handleSelect(() => setTheme("light"))}>
              <Sun className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>{t("command.light")}</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect(() => setTheme("dark"))}>
              <Moon className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>{t("command.dark")}</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
          </Command>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
