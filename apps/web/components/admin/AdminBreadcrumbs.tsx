"use client";

import Link from "next/link";
import { ChevronRight, Home, FolderOpen, FileText, Settings, Users } from "lucide-react";
import { Fragment } from "react";

// Map of icon names to components - allows serializable string props from server components
const iconMap = {
  folder: FolderOpen,
  file: FileText,
  settings: Settings,
  users: Users,
  home: Home,
} as const;

type IconName = keyof typeof iconMap;

export interface BreadcrumbItem {
  label: string;
  href?: string;
  iconName?: IconName;
}

interface AdminBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function AdminBreadcrumbs({ items }: AdminBreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-sm text-muted-foreground mb-6"
    >
      {/* Home link */}
      <Link
        href="/admin"
        className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Dashboard</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const IconComponent = item.iconName ? iconMap[item.iconName] : null;

        return (
          <Fragment key={index}>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" aria-hidden="true" />

            {isLast ? (
              <span className="flex items-center gap-1.5 px-2 py-1 font-medium text-foreground truncate max-w-[200px]">
                {IconComponent && <IconComponent className="h-4 w-4" aria-hidden="true" />}
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href || "#"}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted hover:text-foreground transition-colors truncate max-w-[200px]"
              >
                {IconComponent && <IconComponent className="h-4 w-4" aria-hidden="true" />}
                {item.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
