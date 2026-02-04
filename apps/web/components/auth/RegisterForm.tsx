"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/auth/supabase-browser";
import Link from "next/link";
import { BookOpen, UserPlus } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";

const ALLOWED_DOMAIN = "@tet-edu.com";

export function RegisterForm() {
  const { t } = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirm?: string;
    form?: string;
  }>({});
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
        setErrors({ email: t("auth.emailDomainError", { domain: ALLOWED_DOMAIN }) });
        emailRef.current?.focus();
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setErrors({ password: t("auth.passwordMinLength") });
        passwordRef.current?.focus();
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setErrors({ confirm: t("auth.passwordMismatch") });
        confirmRef.current?.focus();
        setLoading(false);
        return;
      }
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/callback?next=/admin` },
      });
      if (error) throw error;
      router.push("/admin");
      return;
    } catch (err: unknown) {
      setErrors({
        form: err instanceof Error ? err.message : t("auth.registerFailed"),
      });
      emailRef.current?.focus();
    } finally {
      setLoading(false);
    }
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
              <UserPlus className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("auth.registerTitle")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("auth.registerSubtitle", { domain: ALLOWED_DOMAIN })}
              </p>
            </div>
          </div>
          <form onSubmit={handleRegister} className="space-y-5">
            {errors.form && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm" role="status" aria-live="polite">
                {errors.form}
              </div>
            )}
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium mb-2">
                {t("auth.email")}
              </label>
              <input
                id="register-email"
                name="email"
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`user${ALLOWED_DOMAIN}…`}
                required
                autoComplete="email"
                autoCapitalize="none"
                inputMode="email"
                spellCheck={false}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "register-email-error" : undefined}
                className="w-full"
              />
              {errors.email && (
                <p id="register-email-error" className="mt-2 text-xs text-destructive" role="status" aria-live="polite">
                  {errors.email}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium mb-2">
                {t("auth.password")}
              </label>
              <input
                id="register-password"
                name="password"
                ref={passwordRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                autoCapitalize="none"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "register-password-error" : undefined}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1.5">{t("auth.passwordMinHint")}</p>
              {errors.password && (
                <p id="register-password-error" className="mt-2 text-xs text-destructive" role="status" aria-live="polite">
                  {errors.password}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="register-confirm-password" className="block text-sm font-medium mb-2">
                {t("auth.confirmPassword")}
              </label>
              <input
                id="register-confirm-password"
                name="confirmPassword"
                ref={confirmRef}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                autoCapitalize="none"
                aria-invalid={!!errors.confirm}
                aria-describedby={errors.confirm ? "register-confirm-error" : undefined}
                className="w-full"
              />
              {errors.confirm && (
                <p id="register-confirm-error" className="mt-2 text-xs text-destructive" role="status" aria-live="polite">
                  {errors.confirm}
                </p>
              )}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? t("auth.registering") : t("auth.registerButton")}
            </button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-6 pt-6 border-t">
            {t("auth.hasAccount")}{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t("auth.loginLink")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
