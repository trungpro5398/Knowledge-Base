import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/toaster";
import { CommandProvider } from "@/components/command/command-provider";
import { ShortcutsProvider } from "@/components/keyboard/shortcuts-provider";
import { ShortcutsHelp } from "@/components/keyboard/shortcuts-help";
import { ErrorBoundary } from "@/components/error-boundary";
import { createServerSupabaseClient } from "@/lib/auth/supabase-server";
import { signOut } from "@/lib/auth/actions";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Kho Tài Liệu TET - Knowledge Base",
  description: "Tài liệu vận hành, quy trình và quyết định nội bộ của TET. Luôn cập nhật, dễ tìm, dễ hiểu.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };
  const isLoggedIn = !!user;

  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${jakarta.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <CommandProvider>
              <ShortcutsProvider>
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow"
              >
                Bỏ qua để đến nội dung chính
              </a>
              <SiteHeader isLoggedIn={isLoggedIn} signOutAction={signOut} />
              {children}
              <Toaster />
              <ShortcutsHelp />
              </ShortcutsProvider>
            </CommandProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
