"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { Fragment } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
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
        <Home className="h-4 w-4" />
        <span className="sr-only sm:not-sr-only">Dashboard</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <Fragment key={index}>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            
            {isLast ? (
              <span className="flex items-center gap-1.5 px-2 py-1 font-medium text-foreground truncate max-w-[200px]">
                {item.icon}
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href || "#"}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted hover:text-foreground transition-colors truncate max-w-[200px]"
              >
                {item.icon}
                {item.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
