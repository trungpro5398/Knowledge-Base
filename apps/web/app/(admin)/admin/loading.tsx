import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, Building2 } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="p-6 sm:p-8 max-w-5xl w-full mx-auto">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Create space form skeleton */}
      <div className="mt-6 rounded-2xl border bg-card/70 p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-3">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Organizations & spaces skeleton */}
      <div className="mt-8 space-y-10">
        {[1, 2].map((orgIdx) => (
          <div key={orgIdx} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                  <Building2 className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="rounded-xl border bg-card/50 divide-y overflow-hidden">
              {[1, 2, 3].map((spaceIdx) => (
                <div
                  key={spaceIdx}
                  className="flex items-center justify-between px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <FolderOpen className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
