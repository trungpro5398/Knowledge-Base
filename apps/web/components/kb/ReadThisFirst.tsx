"use client";

import Link from "next/link";
import { AlertCircle, BookOpen, ArrowRight } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";

export function ReadThisFirst({
  spaceSlug,
  spaceName,
  items,
}: {
  spaceSlug: string;
  spaceName: string;
  items: Array<{ label: string; path: string }>;
}) {
  const { t } = useLocale();

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 mb-8">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/15 text-primary shrink-0">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
            <span>{t("viewer.startTitle", { space: spaceName })}</span>
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t("viewer.startDescription")}
          </p>
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.path}>
                <Link
                  href={`/kb/${spaceSlug}/${item.path}`}
                  className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {item.label}
                  <ArrowRight className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
