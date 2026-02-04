"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/auth/supabase-browser";
import Link from "next/link";
import { BookOpen, UserPlus } from "lucide-react";

const ALLOWED_DOMAIN = "@tet-edu.com";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
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
        setErrors({ email: `Chỉ cho phép đăng ký bằng email ${ALLOWED_DOMAIN}` });
        emailRef.current?.focus();
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setErrors({ password: "Mật khẩu phải có ít nhất 6 ký tự" });
        passwordRef.current?.focus();
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setErrors({ confirm: "Mật khẩu xác nhận không khớp" });
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
      // Tạm thời tắt confirm email: đăng ký xong redirect luôn vào app (cần tắt "Confirm email" trong Supabase → Auth → Providers → Email)
      router.push("/admin");
      return;
      // setSuccess(true);
    } catch (err: unknown) {
      setErrors({
        form: err instanceof Error ? err.message : "Đăng ký thất bại. Vui lòng thử lại.",
      });
      emailRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Tạm thời comment: không bắt confirm email, đăng ký xong redirect /admin luôn
  // if (success) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
  //       <div className="w-full max-w-md">
  //         <Link href="/" className="...">...</Link>
  //         <div className="card text-center">
  //           <h1>Kiểm tra email</h1>
  //           <p>Chúng tôi đã gửi link xác nhận tới {email}. Vui lòng kiểm tra và nhấp link để kích hoạt tài khoản.</p>
  //           <Link href="/login">Đăng nhập</Link>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <main id="main-content" className="min-h-[100dvh] flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <BookOpen className="h-5 w-5" aria-hidden="true" />
          <span className="font-medium">Knowledge Base for TET</span>
        </Link>
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <UserPlus className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Đăng ký</h1>
              <p className="text-sm text-muted-foreground">
                Chỉ email <strong>{ALLOWED_DOMAIN}</strong> được phép
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
                Email
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
                Mật khẩu
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
              <p className="text-xs text-muted-foreground mt-1.5">Tối thiểu 6 ký tự</p>
              {errors.password && (
                <p id="register-password-error" className="mt-2 text-xs text-destructive" role="status" aria-live="polite">
                  {errors.password}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="register-confirm-password" className="block text-sm font-medium mb-2">
                Xác nhận mật khẩu
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
              {loading ? "Đang đăng ký…" : "Đăng ký"}
            </button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-6 pt-6 border-t">
            Đã có tài khoản?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
