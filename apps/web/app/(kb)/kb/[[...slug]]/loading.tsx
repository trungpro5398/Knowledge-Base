import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex gap-6 py-4 md:py-8">
      <aside className="hidden md:block w-60 shrink-0">
        <nav className="sticky top-8 space-y-4">
          {/* Loading skeleton cho spaces */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
          {/* Loading skeleton cho sidebar */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="space-y-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </div>
        </nav>
      </aside>
      <main id="main-content" className="min-w-0 flex-1 px-4 md:px-0">
        <div className="container max-w-4xl py-4 md:py-8">
          {/* Loading skeleton cho breadcrumb */}
          <div className="mb-6 flex items-center gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
          {/* Loading skeleton cho title */}
          <div className="mb-6 space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
          </div>
          {/* Loading skeleton cho content */}
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ))}
          </div>
        </div>
      </main>
      {/* Mobile sidebar loading */}
      <div className="md:hidden fixed bottom-4 right-4">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </div>
  );
}
