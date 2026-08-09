"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, ChevronDown, Search, X } from "lucide-react";
import type { Space } from "@/lib/api/types";
import { useLocale } from "@/lib/i18n/locale-provider";
import { filterPublicSpaceGroups, groupPublicSpaces, normalizeSpaceSearch } from "@/lib/kb/space-groups";
import { cn } from "@/lib/utils";

interface PublicSpaceNavigatorProps {
  spaces: Space[];
  activeSpaceSlug: string;
}

export function PublicSpaceNavigator({ spaces, activeSpaceSlug }: PublicSpaceNavigatorProps) {
  const { locale, t } = useLocale();
  const navigationId = useId();
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    return groupPublicSpaces(spaces, {
      locale,
      standaloneLabel: t("viewer.standaloneLabel"),
      activeSpaceSlug,
    });
  }, [activeSpaceSlug, locale, spaces, t]);

  const activeGroupKey = groups.find((group) => group.isActive)?.key;
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(activeGroupKey ? [activeGroupKey] : groups[0] ? [groups[0].key] : [])
  );
  const normalizedQuery = normalizeSpaceSearch(query.trim());
  const filteredGroups = useMemo(() => {
    return filterPublicSpaceGroups(groups, normalizedQuery);
  }, [groups, normalizedQuery]);
  const showFilter = groups.length > 1 || spaces.length > 5;

  const toggleGroup = (key: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section aria-labelledby={`${navigationId}-title`}>
      <div className="mb-2 flex items-start justify-between gap-2 px-1">
        <div className="min-w-0">
          <h2 id={`${navigationId}-title`} className="text-[11px] font-medium text-muted-foreground">
            {t("sidebar.spaces")}
          </h2>
          <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
            {t("sidebar.librarySummary", { groups: groups.length, spaces: spaces.length })}
          </p>
        </div>
      </div>

      {showFilter ? (
        <div className="relative mb-2">
          <Search
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            name="space-filter"
            autoComplete="off"
            placeholder={t("sidebar.librarySearchPlaceholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="search-input-no-native-clear h-8 w-full rounded-md border-0 bg-muted/40 pl-8 pr-7 text-sm placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label={t("sidebar.librarySearchLabel")}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label={t("sidebar.clearLibrarySearch")}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-1">
        {filteredGroups.map((group) => {
          const isExpanded = normalizedQuery.length > 0 || expandedGroups.has(group.key);
          const panelId = `${navigationId}-space-group-${group.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
          return (
            <div key={group.key} className="rounded-lg border border-border/60 bg-card/30">
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                disabled={normalizedQuery.length > 0}
                aria-expanded={isExpanded}
                aria-controls={panelId}
                className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 disabled:cursor-default"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-foreground">{group.name}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {t("sidebar.groupSpaceCount", { count: group.spaces.length })}
                  </span>
                </span>
                {group.isActive ? (
                  <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                    {t("sidebar.currentGroup")}
                  </span>
                ) : null}
                <ChevronDown
                  className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", isExpanded && "rotate-180")}
                  aria-hidden="true"
                />
              </button>
              {isExpanded ? (
                <div id={panelId} className="space-y-0.5 border-t border-border/50 p-1.5">
                  {group.spaces.map((space) => {
                    const isActive = space.slug === activeSpaceSlug;
                    return (
                      <Link
                        key={space.id}
                        href={`/kb/${space.slug}`}
                        prefetch={false}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "block min-w-0 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                          isActive ? "bg-primary/10 text-primary" : "text-foreground"
                        )}
                      >
                        <span className="block truncate font-medium">{space.name}</span>
                        {space.description ? (
                          <span className="mt-0.5 block line-clamp-1 text-[10px] text-muted-foreground">
                            {space.description}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {filteredGroups.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground" role="status">
          {t("sidebar.noLibrariesFound")}
        </p>
      ) : null}
      <p className="mt-2 px-1 text-[10px] leading-relaxed text-muted-foreground">
        {t("sidebar.publicOnlyHint")}
      </p>
    </section>
  );
}
