"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, List } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";
import { extractMarkdownToc } from "@/lib/kb/headings";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TocProps {
  headings?: string[];
  items?: TocItem[];
  responsive?: boolean;
}

function normalizeHeadingText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function Toc({ headings, items: tocItems, responsive = false }: TocProps) {
  const [activeId, setActiveId] = useState("");
  const [resolvedIds, setResolvedIds] = useState<Record<string, string>>({});
  const { t } = useLocale();
  const items = useMemo(() => {
    if (tocItems) return tocItems;
    return extractMarkdownToc((headings ?? []).join("\n"));
  }, [headings, tocItems]);

  useEffect(() => {
    const headingsInDocument = Array.from(
      document.querySelectorAll<HTMLElement>(
        "article.prose-kb h1, article.prose-kb h2, article.prose-kb h3",
      ),
    );
    const usedHeadingIds = new Set<string>();
    const nextResolvedIds: Record<string, string> = {};

    for (const item of items) {
      const exactMatch = document.getElementById(item.id);
      const fallbackMatch = headingsInDocument.find(
        (heading) =>
          !usedHeadingIds.has(heading.id) &&
          heading.tagName.toLowerCase() === `h${item.level}` &&
          normalizeHeadingText(heading.textContent ?? "") === normalizeHeadingText(item.text)
      );
      const targetId = exactMatch?.id ?? fallbackMatch?.id;
      if (targetId) {
        nextResolvedIds[item.id] = targetId;
        usedHeadingIds.add(targetId);
      }
    }

    setResolvedIds(nextResolvedIds);
  }, [items]);

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActiveId(e.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -80% 0px" }
    );
    const observedIds = new Set<string>();
    for (const item of items) {
      const targetId = resolvedIds[item.id] ?? item.id;
      if (observedIds.has(targetId)) continue;
      const heading = document.getElementById(targetId);
      if (heading) observer.observe(heading);
      observedIds.add(targetId);
    }
    return () => observer.disconnect();
  }, [items, resolvedIds]);

  const renderItems = () => (
    <ul className="space-y-1 text-sm">
      {items.map((item) => {
        const targetId = resolvedIds[item.id] ?? item.id;
        return (
          <li
            key={item.id}
            style={{ paddingLeft: Math.max(0, item.level - 2) * 12 }}
            className={activeId === targetId ? "font-medium text-primary" : "text-muted-foreground"}
          >
            <a
              href={`#${targetId}`}
              className="block rounded-md px-2 py-1.5 leading-snug transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-current={activeId === targetId ? "location" : undefined}
            >
              {item.text}
            </a>
          </li>
        );
      })}
    </ul>
  );

  if (responsive) {
    return (
      <>
        <details className="group/toc mb-6 overflow-hidden rounded-xl border bg-card/70 xl:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
            <List className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="flex-1">{t("viewer.contentsLabel")}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open/toc:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
          </summary>
          <nav className="border-t px-3 py-3" aria-label={t("viewer.contentsLabel")}>
            {renderItems()}
          </nav>
        </details>
        <nav className="hidden border-l pl-4 xl:block" aria-label={t("viewer.contentsLabel")}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("viewer.contentsLabel")}
          </h2>
          {renderItems()}
        </nav>
      </>
    );
  }

  return (
    <nav className="border-l pl-4" aria-label={t("viewer.contentsLabel")}>
      <h2 className="mb-2 text-sm font-semibold">{t("viewer.contentsLabel")}</h2>
      {renderItems()}
    </nav>
  );
}
