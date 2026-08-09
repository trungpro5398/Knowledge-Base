"use client";

import { Clock3 } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";

export function ReadingTimeBadge({ minutes }: { minutes: number }) {
  const { t } = useLocale();

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
      {t("viewer.readingTime", { minutes })}
    </span>
  );
}
