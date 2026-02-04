import Link from "next/link";
import { pathToSlug } from "@/lib/routing/slug";

interface BreadcrumbItem {
  title: string;
  path: string;
}

interface BreadcrumbsProps {
  spaceSlug: string;
  path: string;
  title: string;
  items?: BreadcrumbItem[];
  className?: string;
  /** Sticky bar below header with chip-style breadcrumbs */
  sticky?: boolean;
}

export function Breadcrumbs({
  spaceSlug,
  path,
  title,
  items: apiItems,
  className = "",
  sticky = false,
}: BreadcrumbsProps) {
  const crumbs: { label: string; href: string }[] = apiItems
    ? apiItems.map((item, i) => {
        const isLast = i === apiItems.length - 1;
        const href = isLast
          ? ""
          : item.path === ""
            ? "/kb"
            : item.path === spaceSlug
              ? `/kb/${spaceSlug}`
              : `/kb/${spaceSlug}/${item.path.split(".").join("/")}`;
        return { label: item.title, href };
      })
    : (() => {
        const parts = pathToSlug(path);
        const c: { label: string; href: string }[] = [
          { label: "KB", href: "/kb" },
          { label: spaceSlug, href: `/kb/${spaceSlug}` },
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
      aria-label="Breadcrumb"
    >
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <span className="text-muted-foreground/60" aria-hidden="true">
              /
            </span>
          )}
          {c.href ? (
            <Link
              href={c.href}
              className="inline-flex items-center rounded-full px-2.5 py-1 text-muted-foreground bg-muted/70 hover:bg-muted hover:text-foreground transition-colors text-xs font-medium"
            >
              {c.label}
            </Link>
          ) : (
            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-foreground bg-primary/10 text-primary font-medium text-xs">
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
