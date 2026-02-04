import { Skeleton } from "@/components/ui/skeleton";

export default function SpaceLoading() {
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header skeleton */}
      <header className="shrink-0 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </header>

      {/* Main: sidebar + content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar skeleton */}
        <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r bg-card/80">
          <div className="p-4 border-b space-y-3">
            <Skeleton className="h-4 w-16" />
            <div className="space-y-1">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
          <div className="p-4 flex-1 space-y-2">
            <Skeleton className="h-4 w-20" />
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-8 w-full" style={{ width: `${100 - i * 8}%` }} />
            ))}
          </div>
        </aside>

        {/* Content skeleton */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl space-y-6">
            <Skeleton className="h-8 w-3/4" />
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
