"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/auth/supabase-browser";
import { useLocale } from "@/lib/i18n/locale-provider";

export function LoginForm() {
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const callbackError = new URLSearchParams(window.location.search).get("error");
    if (callbackError === "domain") {
      setError(t("auth.oauthDomainError"));
    } else if (callbackError === "auth") {
      setError(t("auth.loginFailed"));
    }
  }, [t]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`,
        queryParams: {
          hd: "tet-edu.com",
          prompt: "select_account",
        },
      },
    });

    if (oauthError) {
      setError(oauthError.message || t("auth.loginFailed"));
      setLoading(false);
    }
  };

  return (
    <main id="main-content" className="min-h-[100dvh] flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <BrandLogo className="h-10 w-[178px]" />
          <span className="sr-only">{t("auth.appName")}</span>
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
            <p className="text-sm text-muted-foreground">{t("auth.googleOnly")}</p>
            {error && (
              <p id="login-error" className="text-xs text-destructive" role="status" aria-live="polite">
                {error}
              </p>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? t("auth.googleLoggingIn") : t("auth.googleLogin")}
            </button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-6 pt-6 border-t">
            {t("auth.googleWorkspaceHint")}
          </p>
        </div>
      </div>
    </main>
  );
}
