"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "cmdk";
import { Search, FileText, Home, Plus, Moon, Sun, Folder, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { api } from "@/lib/api/client";
import type { ApiResponse, PaginatedResponse, SearchResult, Space } from "@/lib/api/types";
import { getRecentPages, addRecentPage } from "@/lib/recent-pages";

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [recentPages, setRecentPages] = useState<Array<{ id: string; title: string; path: string }>>([]);

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
      const timer = setTimeout(() => {
        api
          .get<PaginatedResponse<SearchResult>>(
            `/api/search?q=${encodeURIComponent(searchQuery)}&limit=8`
          )
          .then((res) => setSearchResults(res.data || []))
          .catch(() => setSearchResults([]));
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
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
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command className="rounded-lg border shadow-md">
        <CommandInput
          placeholder="Tìm kiếm trang, actions…"
          value={searchQuery}
          onValueChange={setSearchQuery}
          aria-label="Tìm kiếm nhanh"
        />
        <CommandList>
          <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>

          {searchResults.length > 0 && (
            <>
              <CommandGroup heading="Kết quả tìm kiếm">
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
              <CommandGroup heading="Gần đây">
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

          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => handleSelect(() => router.push("/admin"))}>
              <Home className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>Dashboard</span>
            </CommandItem>
            {spaces.length > 0 && (
              <CommandItem
                onSelect={() =>
                  handleSelect(() => router.push(`/admin/spaces/${spaces[0]!.id}/pages/new`))
                }
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Trang mới</span>
              </CommandItem>
            )}
            <CommandItem onSelect={() => handleSelect(() => router.push("/kb"))}>
              <Search className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>Xem KB</span>
            </CommandItem>
          </CommandGroup>

          {spaces.length > 0 && searchQuery.trim() === "" && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Spaces">
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
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => handleSelect(() => setTheme("light"))}>
              <Sun className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>Light</span>
            </CommandItem>
            <CommandItem onSelect={() => handleSelect(() => setTheme("dark"))}>
              <Moon className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>Dark</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
