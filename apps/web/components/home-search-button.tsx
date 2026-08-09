"use client";

import type { ReactNode } from "react";
import { Command, Search } from "lucide-react";

export function HomeSearchButton({
  title,
  description,
}: {
  title: ReactNode;
  description: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("kb:open-search"))}
      onPointerEnter={() => window.dispatchEvent(new Event("kb:preload-search"))}
      onFocus={() => window.dispatchEvent(new Event("kb:preload-search"))}
      className="group flex w-full items-center gap-3 rounded-xl border bg-card/80 px-4 py-3.5 text-left shadow-sm transition-[border-color,box-shadow,background-color] hover:border-primary/40 hover:bg-card hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-labelledby="home-search-label"
    >
      <Search className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span id="home-search-label" className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{description}</span>
      </span>
      <kbd className="hidden items-center gap-1 rounded border bg-muted px-2 py-1 text-xs text-muted-foreground sm:inline-flex" aria-hidden="true">
        <Command className="h-3 w-3" aria-hidden="true" />K
      </kbd>
    </button>
  );
}
