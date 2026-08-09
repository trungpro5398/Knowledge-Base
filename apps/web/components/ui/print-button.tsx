"use client";

import { Printer } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";

export function PrintButton() {
  const { t } = useLocale();

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 print:hidden"
      title={t("viewer.printTitle")}
    >
      <Printer className="h-3.5 w-3.5" aria-hidden="true" />
      {t("viewer.printButton")}
    </button>
  );
}
