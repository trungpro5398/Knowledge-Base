"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { pathToSlug } from "@/lib/routing/slug";
import { useLocale } from "@/lib/i18n/locale-provider";

interface BreadcrumbItem {
  title: string;
  path: string;
}

interface BreadcrumbsProps {
  spaceSlug: string;
  path: string;
  title: string;
  spaceName?: string;
  items?: BreadcrumbItem[];
  className?: string;
  /** Sticky bar below header with chip-style breadcrumbs */
  sticky?: boolean;
}

export function Breadcrumbs({
  spaceSlug,
  path,
  title,
  spaceName,
  items: apiItems,
  className = "",
  sticky = false,
}: BreadcrumbsProps) {
  const { t } = useLocale();
  const breadcrumbRef = useRef<HTMLElement>(null);
  const currentCrumbRef = useRef<HTMLSpanElement>(null);
  const crumbs: { label: string; href: string }[] = apiItems
    ? [
        {
          label: t("library.allLibraries"),
          href: "/kb",
        },
        {
          label: spaceName || spaceSlug,
          href: `/kb/${spaceSlug}`,
        },
        ...apiItems.slice(2).map((item, i, pageItems) => ({
          label: item.title,
          href: i === pageItems.length - 1
            ? ""
            : `/kb/${spaceSlug}/${item.path.split(".").join("/")}`,
        })),
      ]
    : (() => {
        const parts = pathToSlug(path);
        const c: { label: string; href: string }[] = [
          { label: t("library.allLibraries"), href: "/kb" },
          { label: spaceName || spaceSlug, href: `/kb/${spaceSlug}` },
        ];
        let acc = "";
        for (let i = 0; i < parts.length - 1; i++) {
          acc += (acc ? "." : "") + parts[i];
          c.push({
            label: parts[i],
            href: `/kb/${spaceSlug}/${parts.slice(0, i + 1).join("/")}`,
          });
        }
        c.push({ label: title, href: "" });
        return c;
      })();

  useEffect(() => {
    const breadcrumb = breadcrumbRef.current;
    const currentCrumb = currentCrumbRef.current;
    if (!breadcrumb || !currentCrumb) return;
    breadcrumb.scrollLeft = Math.max(
      0,
      currentCrumb.offsetLeft + currentCrumb.offsetWidth - breadcrumb.clientWidth
    );
  }, [path, title]);

  const content = (
    <nav
      ref={breadcrumbRef}
      className={`flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-1 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      aria-label={t("viewer.breadcrumbLabel")}
    >
      {crumbs.map((c, i) => (
        <span key={`${c.href}-${c.label}`} className="flex shrink-0 items-center gap-1.5">
          {i > 0 ? (
            <span className="text-muted-foreground/60" aria-hidden="true">
              /
            </span>
          ) : null}
          {c.href ? (
            <Link
              href={c.href}
              className="inline-flex max-w-[70vw] items-center truncate rounded-full bg-muted/70 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 md:max-w-72"
              title={c.label}
            >
              {c.label}
            </Link>
          ) : (
            <span
              ref={currentCrumbRef}
              aria-current="page"
              className="inline-flex max-w-[70vw] items-center truncate rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary md:max-w-72"
              title={c.label}
            >
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );

  if (sticky) {
    return (
      <div className="sticky top-14 z-40 py-3 -mt-3 mb-4 bg-background/95 backdrop-blur-sm border-b border-border/50 -mx-4 px-4 md:-mx-0 md:px-0">
        {content}
      </div>
    );
  }

  return <div className="mb-6">{content}</div>;
}
