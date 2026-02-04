"use client";

import { useLocale } from "@/lib/i18n/locale-provider";

export function SpaceNotFound() {
  const { t } = useLocale();
  return (
    <div className="p-8">
      <p className="text-muted-foreground">{t("admin.spaceNotFound")}</p>
    </div>
  );
}
