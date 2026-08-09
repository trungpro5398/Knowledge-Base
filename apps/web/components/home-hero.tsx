import Link from "next/link";
import { BookOpen } from "lucide-react";
import { HomeSearchButton } from "@/components/home-search-button";
import { LocalizedText } from "@/components/localized-text";

export function HomeHero() {
  return (
    <main id="main-content" className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>
      <div className="container mx-auto px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-primary" translate="no">
            TET Education Group
          </p>
          <h1 className="mb-6 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-balance text-4xl font-bold tracking-tight md:text-6xl">
            <LocalizedText id="home.title" />
          </h1>
          <p className="mx-auto mb-4 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl">
            <LocalizedText id="home.description" />
          </p>
          <p className="mx-auto mb-10 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
            <LocalizedText id="home.tagline" />
          </p>

          <div className="mx-auto mb-4 max-w-xl text-left">
            <HomeSearchButton
              title={<LocalizedText id="home.quickSearch" />}
              description={<LocalizedText id="home.quickSearchDescription" />}
            />
          </div>
          <div className="flex flex-col items-center gap-4">
            <Link
              href="/kb"
              className="btn-primary inline-flex min-h-12 items-center gap-2 px-8 py-3 text-base font-semibold sm:text-lg"
            >
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              <LocalizedText id="home.browse" />
            </Link>
            <p className="max-w-md text-pretty text-sm text-muted-foreground">
              <LocalizedText id="home.accessHint" />
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
