import Link from "next/link";
import { pathToSlug } from "@/lib/routing/slug";

interface BreadcrumbsProps {
  spaceSlug: string;
  path: string;
  title: string;
}

export function Breadcrumbs({ spaceSlug, path, title }: BreadcrumbsProps) {
  const parts = pathToSlug(path);
  const crumbs: { label: string; href: string }[] = [
    { label: "KB", href: "/kb" },
    { label: spaceSlug, href: `/kb/${spaceSlug}` },
  ];

  let acc = "";
  for (let i = 0; i < parts.length - 1; i++) {
    acc += (acc ? "." : "") + parts[i];
    crumbs.push({
      label: parts[i],
      href: `/kb/${spaceSlug}/${parts.slice(0, i + 1).join("/")}`,
    });
  }
  crumbs.push({ label: title, href: "" });

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
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
