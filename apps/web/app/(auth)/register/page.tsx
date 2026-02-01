"use client";

import { useState } from "react";
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
        setError(`Chỉ cho phép đăng ký bằng email ${ALLOWED_DOMAIN}`);
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError("Mật khẩu phải có ít nhất 6 ký tự");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Mật khẩu xác nhận không khớp");
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
      setError(err instanceof Error ? err.message : "Đăng ký thất bại");
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <BookOpen className="h-5 w-5" />
          <span className="font-medium">Knowledge Base for TET</span>
        </Link>
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Đăng ký</h1>
              <p className="text-sm text-muted-foreground">
                Chỉ email <strong>{ALLOWED_DOMAIN}</strong> được phép
              </p>
            </div>
          </div>
          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`user${ALLOWED_DOMAIN}`}
                required
                autoComplete="email"
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1.5">Tối thiểu 6 ký tự</p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                Xác nhận mật khẩu
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? "Đang đăng ký..." : "Đăng ký"}
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
    </div>
  );
}
