import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { createServerSupabaseClient } from "@/lib/auth/supabase-server";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Knowledge Base for TET",
  description: "Tài liệu vận hành, quy trình và quyết định nội bộ của TET. Luôn cập nhật, dễ tìm, dễ hiểu.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  const isLoggedIn = !!session?.user;

  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${jakarta.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SiteHeader isLoggedIn={isLoggedIn} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
