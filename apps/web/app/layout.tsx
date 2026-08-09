import type { Metadata } from "next";
import { Pathway_Extreme, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/toaster";
import { CommandProvider } from "@/components/command/command-provider";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import { ShortcutsProvider } from "@/components/keyboard/shortcuts-provider";
import { ShortcutsHelp } from "@/components/keyboard/shortcuts-help";
import { ErrorBoundary } from "@/components/error-boundary";
import { getServerUser, hasSupabaseAuthCookie } from "@/lib/auth/supabase-server";
import { signOut } from "@/lib/auth/actions";
import { SkipLink } from "@/components/skip-link";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const pathway = Pathway_Extreme({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://kb.tet-edu.com"),
  title: "Kho Tài Liệu TET - Knowledge Base",
  description: "Tài liệu vận hành, quy trình và quyết định nội bộ của TET. Luôn cập nhật, dễ tìm, dễ hiểu.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = (await hasSupabaseAuthCookie()) ? await getServerUser() : null;
  const isLoggedIn = !!user;

  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${jakarta.variable} ${pathway.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <LocaleProvider>
            <CommandProvider isLoggedIn={isLoggedIn}>
              <ShortcutsProvider>
              <SkipLink />
              <SiteHeader isLoggedIn={isLoggedIn} signOutAction={signOut} />
              {children}
              <Toaster />
              <ShortcutsHelp />
              </ShortcutsProvider>
            </CommandProvider>
            </LocaleProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
