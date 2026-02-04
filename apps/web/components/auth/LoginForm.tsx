"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, LogIn } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";

export function LoginForm() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const redirectTo = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("redirect") || "/admin" : "/admin";
    const res = await fetch("/api/auth/login", {
      method: "POST",
      redirect: "manual",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, redirectTo }),
    });
    if (res.type === "opaqueredirect" || res.status === 302) {
      const location = res.headers.get("Location") ?? redirectTo;
      window.location.href = location;
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        (data.error as string) ?? t("auth.loginFailed")
      );
      passwordRef.current?.focus();
    }
    setLoading(false);
  };

  return (
    <main id="main-content" className="min-h-[100dvh] flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <BookOpen className="h-5 w-5" aria-hidden="true" />
          <span className="font-medium">{t("auth.appName")}</span>
        </Link>
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <LogIn className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("auth.loginTitle")}</h1>
              <p className="text-sm text-muted-foreground">{t("auth.loginSubtitle")}</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium mb-2">
                {t("auth.email")}
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
                required
                autoComplete="email"
                autoCapitalize="none"
                inputMode="email"
                spellCheck={false}
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium mb-2">
                {t("auth.password")}
              </label>
              <input
                id="login-password"
                name="password"
                ref={passwordRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                autoCapitalize="none"
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
                className="w-full"
              />
              {error && (
                <p id="login-error" className="mt-2 text-xs text-destructive" role="status" aria-live="polite">
                  {error}
                </p>
              )}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? t("auth.loggingIn") : t("header.login")}
            </button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-6 pt-6 border-t">
            {t("auth.noAccount")}{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              {t("auth.registerLink")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
