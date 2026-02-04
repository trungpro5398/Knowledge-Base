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
}

export function Breadcrumbs({
  spaceSlug,
  path,
  title,
  items: apiItems,
  className = "",
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

  return (
    <nav
      className={`flex items-center gap-2 text-sm text-muted-foreground mb-6 ${className}`}
      aria-label="Breadcrumb"
    >
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span>/</span>}
          {c.href ? (
            <Link href={c.href} className="hover:text-foreground">
              {c.label}
            </Link>
          ) : (
            <span className="text-foreground">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
