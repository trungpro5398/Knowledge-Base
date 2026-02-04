"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { Search } from "lucide-react";
import type { PaginatedResponse, SearchResult } from "@/lib/api/types";

export function SearchBar() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const search = async () => {
    if (!q.trim()) return;
    try {
      const res = await api.get<PaginatedResponse<SearchResult>>(
        `/api/search?q=${encodeURIComponent(q)}&limit=10`
      );
      setResults(res.data ?? []);
      setOpen(true);
    } catch {
      setResults([]);
    }
  };

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground shrink-0" />
        <input
          type="search"
          name="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())}
          placeholder="Tìm trang… (Enter)"
          aria-label="Tìm trang"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          className="w-full pl-9 pr-3 py-2 text-sm"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border bg-card shadow-lg z-20 overflow-hidden">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                router.push(`/admin/spaces/${r.space_id}/pages/${r.id}/edit`);
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors border-b last:border-0"
            >
              {r.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
