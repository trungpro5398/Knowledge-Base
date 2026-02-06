"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { Search, Loader2 } from "lucide-react";
import type { PaginatedResponse, SearchResult } from "@/lib/api/types";
import { useLocale } from "@/lib/i18n/locale-provider";

export function SearchBar() {
  const { t } = useLocale();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (!q.trim()) return;
    setSearching(true);
    setOpen(true);
    try {
      const res = await api.get<PaginatedResponse<SearchResult>>(
        `/api/search?q=${encodeURIComponent(q)}&limit=10`
      );
      setResults(res.data ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative flex items-center">
        {searching ? (
          <Loader2 className="absolute left-2.5 h-4 w-4 text-muted-foreground shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        )}
        <input
          type="search"
          name="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())}
          placeholder={t("search.placeholder")}
          aria-label={t("search.ariaLabel")}
          aria-expanded={open}
          aria-controls="admin-search-results"
          inputMode="search"
          enterKeyHint="search"
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          className="w-full pl-9 pr-3 py-2 text-sm"
        />
      </div>
      {open && (
        <div
          id="admin-search-results"
          role="region"
          aria-label={t("search.ariaLabel")}
          className="absolute top-full left-0 right-0 mt-1 rounded-lg border bg-card shadow-lg z-20 overflow-hidden"
        >
          {searching ? (
            <div className="px-3 py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("search.searching")}
            </div>
          ) : results.length > 0 ? (
            results.map((r) => (
            <Link
              key={r.id}
              href={`/admin/spaces/${r.space_id}/pages/${r.id}/edit`}
              onClick={() => setOpen(false)}
              className="block w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors border-b last:border-0"
            >
              {r.title}
            </Link>
          ))
          ) : q.trim() ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              {t("common.noResults")}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
