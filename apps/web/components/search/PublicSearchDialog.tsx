"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk";
import { FileText, Loader2, Search } from "lucide-react";
import { api } from "@/lib/api/client";
import type { PaginatedResponse, PublicSearchResult } from "@/lib/api/types";
import { useLocale } from "@/lib/i18n/locale-provider";

export function PublicSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSearchError(false);
      return;
    }

    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(false);
      try {
        const response = await api.get<PaginatedResponse<PublicSearchResult>>(
          `/api/public/search?q=${encodeURIComponent(query.trim())}&limit=12`,
          { signal: controller.signal, auth: false }
        );
        setResults(response.data ?? []);
      } catch {
        if (controller.signal.aborted) return;
        setResults([]);
        setSearchError(true);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const openResult = (result: PublicSearchResult) => {
    const pagePath = result.path.split(".").filter(Boolean).join("/");
    onOpenChange(false);
    router.push(`/kb/${result.space_slug}/${pagePath}`);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command shouldFilter={false} className="rounded-lg border shadow-md">
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={t("publicSearch.placeholder")}
          aria-label={t("publicSearch.ariaLabel")}
        />
        <CommandList>
          {searching ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t("publicSearch.searching")}
            </div>
          ) : searchError ? (
            <div className="px-6 py-10 text-center text-sm text-destructive" role="status" aria-live="polite">
              {t("publicSearch.error")}
            </div>
          ) : query.trim().length < 2 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted-foreground">
              <Search className="h-5 w-5" aria-hidden="true" />
              <p>{t("publicSearch.hint")}</p>
            </div>
          ) : (
            <>
              <CommandEmpty>{t("publicSearch.noResults")}</CommandEmpty>
              {results.map((result) => (
                <CommandItem
                  key={result.page_id}
                  value={`${result.title} ${result.space_name}`}
                  onSelect={() => openResult(result)}
                  className="items-start gap-3 px-3 py-3"
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{result.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {result.organization_name
                        ? `${result.organization_name} · ${result.space_name}`
                        : result.space_name}
                    </span>
                    {result.content_snippet && (
                      <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground/80">
                        {result.content_snippet}
                      </span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
