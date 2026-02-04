"use client";

import { useLocale } from "@/lib/i18n/locale-provider";

export function KbWelcomeEmpty() {
  const { t } = useLocale();
  return (
    <div className="text-center py-20 sm:py-32">
      <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 mb-6">
        <svg className="h-10 w-10 sm:h-12 sm:w-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-3">{t("welcome.title")}</h2>
      <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-md mx-auto">
        {t("welcome.selectDoc")}
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-lg text-sm text-muted-foreground">
        <span>💡</span>
        <span className="hidden sm:inline">{t("welcome.tip")}</span>
        <span className="sm:hidden">{t("welcome.tipMobile")}</span>
      </div>
    </div>
  );
}
