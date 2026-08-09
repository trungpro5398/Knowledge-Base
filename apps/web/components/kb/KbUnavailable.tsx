"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";

export function KbUnavailable({ onRetry }: { onRetry?: () => void }) {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <main id="main-content" className="container flex min-h-[calc(100dvh-3.5rem)] max-w-xl items-center px-4 py-16">
      <section className="w-full rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8" role="alert">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-balance text-2xl font-bold">{t("viewer.loadErrorTitle")}</h1>
        <p className="mt-2 text-pretty text-sm leading-6 text-muted-foreground">
          {t("viewer.loadErrorDescription")}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onRetry ?? (() => router.refresh())}
            className="btn-primary min-h-11 gap-2"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t("viewer.tryAgain")}
          </button>
          <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            {t("viewer.backHome")}
          </Link>
        </div>
      </section>
    </main>
  );
}
