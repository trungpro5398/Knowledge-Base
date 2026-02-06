import { Skeleton } from "@/components/ui/skeleton";
import { Building2 } from "lucide-react";

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

      <div className="mt-8 rounded-2xl border bg-card/70 p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="mt-4 space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-3">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {[1, 2, 3].map((orgIdx) => (
          <div key={orgIdx} className="rounded-xl border bg-card/50 p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                  <Building2 className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-44" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-3 w-52" />
                </div>
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
