"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  translations,
  type Locale,
  type TranslationKey,
  type TranslationParams,
} from "./translations";

const STORAGE_KEY = "kb-locale";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("vi");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored === "vi" || stored === "en") setLocaleState(stored);
    } catch {}
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
      document.documentElement.lang = locale === "vi" ? "vi" : "en";
    } catch {}
  }, [mounted, locale]);

  const setLocale = (l: Locale) => setLocaleState(l);
  const t = (key: TranslationKey, params?: TranslationParams) => {
    let str = (translations[locale][key] as string) ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`{{${k}}}`, "g"), String(v));
      });
    }
    return str;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}
