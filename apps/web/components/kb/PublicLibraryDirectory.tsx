"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, FolderOpen, Search, X } from "lucide-react";
import type { Space } from "@/lib/api/types";
import { useLocale } from "@/lib/i18n/locale-provider";
import { filterPublicSpaceGroups, groupPublicSpaces } from "@/lib/kb/space-groups";

export function PublicLibraryDirectory({ spaces }: { spaces: Space[] }) {
  const { locale, t } = useLocale();
  const [query, setQuery] = useState("");
  const groups = useMemo(
    () =>
      groupPublicSpaces(spaces, {
        locale,
        standaloneLabel: t("viewer.standaloneLabel"),
      }),
    [locale, spaces, t]
  );
  const filteredGroups = useMemo(
    () => filterPublicSpaceGroups(groups, query),
    [groups, query]
  );

  return (
    <main id="main-content" className="min-h-[calc(100dvh-3.5rem)]">
      <div className="container mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-primary">
            TET Education Group
          </p>
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {t("library.title")}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("library.description")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("library.summary", { groups: groups.length, spaces: spaces.length })}
          </p>
        </header>

        {spaces.length > 0 ? (
          <>
            <div className="relative mt-8 max-w-xl">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                name="library-filter"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("library.searchPlaceholder")}
                aria-label={t("library.searchLabel")}
                className="search-input-no-native-clear h-12 w-full rounded-xl border border-border bg-card pl-11 pr-11 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label={t("library.clearSearch")}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <div className="mt-10 space-y-10" aria-live="polite">
              {filteredGroups.map((group) => (
                <section key={group.key} aria-labelledby={`library-${group.key}`}>
                  <div className="mb-4 flex items-center gap-3 border-b border-border pb-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h2 id={`library-${group.key}`} className="truncate text-lg font-semibold">
                        {group.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {t("library.groupCount", { count: group.spaces.length })}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.spaces.map((space) => (
                      <Link
                        key={space.id}
                        href={`/kb/${space.slug}`}
                        prefetch={false}
                        className="group flex min-h-36 flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/50 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                            <FolderOpen className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <ArrowRight
                            className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none"
                            aria-hidden="true"
                          />
                        </div>
                        <h3 className="mt-4 break-words font-semibold text-foreground">
                          {space.name}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                          {space.description || t("library.openHint")}
                        </p>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {filteredGroups.length === 0 ? (
              <div className="mt-12 rounded-xl border border-dashed border-border px-6 py-12 text-center">
                <p className="font-medium">{t("library.noResults")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("library.noResultsHint")}
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <div className="mt-10 rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">{t("library.emptyTitle")}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              {t("library.emptyDescription")}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
