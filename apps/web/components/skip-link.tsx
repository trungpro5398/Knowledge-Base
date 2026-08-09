"use client";

import { useLocale } from "@/lib/i18n/locale-provider";

export function SkipLink() {
  const { t } = useLocale();

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow"
    >
      {t("header.skipToContent")}
    </a>
  );
}
