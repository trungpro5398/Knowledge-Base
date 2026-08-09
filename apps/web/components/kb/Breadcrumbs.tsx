"use client";

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

  const content = (
    <nav
      className={`flex flex-wrap items-center gap-1.5 text-sm ${className}`}
      aria-label={t("viewer.breadcrumbLabel")}
    >
      {crumbs.map((c, i) => (
        <span key={`${c.href}-${c.label}`} className="flex min-w-0 items-center gap-1.5">
          {i > 0 ? (
            <span className="text-muted-foreground/60" aria-hidden="true">
              /
            </span>
          ) : null}
          {c.href ? (
            <Link
              href={c.href}
              className="inline-flex max-w-full items-center truncate rounded-full bg-muted/70 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              title={c.label}
            >
              {c.label}
            </Link>
          ) : (
            <span className="inline-flex max-w-full items-center truncate rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary" title={c.label}>
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
