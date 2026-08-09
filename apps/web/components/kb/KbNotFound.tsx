"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";

export function KbNotFound() {
  const { t } = useLocale();

  return (
    <main id="main-content" className="container flex min-h-[calc(100dvh-3.5rem)] max-w-xl items-center px-4 py-16">
      <section className="w-full rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileQuestion className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-balance text-2xl font-bold">{t("viewer.notFoundTitle")}</h1>
        <p className="mt-2 text-pretty text-sm leading-6 text-muted-foreground">
          {t("viewer.notFoundDescription")}
        </p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          {t("viewer.backHome")}
        </Link>
      </section>
    </main>
  );
}
