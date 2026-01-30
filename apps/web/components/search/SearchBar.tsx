"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";

export function SearchBar() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ page_id: string; title: string; space_id: string }[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const search = async () => {
    if (!q.trim()) return;
    try {
      const res = await apiClient(`/api/search?q=${encodeURIComponent(q)}&limit=10`);
      setResults(res.data ?? []);
      setOpen(true);
    } catch {
      setResults([]);
    }
  };

  return (
    <div className="relative">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && search()}
        placeholder="Search..."
        className="w-48 px-2 py-1 text-sm border rounded bg-background"
      />
      <button onClick={search} className="ml-1 text-sm">Search</button>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-auto border rounded bg-background shadow-lg z-10">
          {results.map((r) => (
            <button
              key={r.page_id}
              onClick={() => {
                router.push(`/admin/spaces/${r.space_id}/pages/${r.page_id}/edit`);
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-2 hover:bg-muted text-sm"
            >
              {r.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
