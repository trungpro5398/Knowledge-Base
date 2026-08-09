"use client";

import { useLocale } from "@/lib/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function PageStatusBadge({ status }: { status: string }) {
  const { t } = useLocale();
  const isPublished = status === "published";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        isPublished
          ? "bg-primary/15 text-primary"
          : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
      )}
    >
      {isPublished ? t("viewer.statusOfficial") : t("viewer.statusDraft")}
    </span>
  );
}
