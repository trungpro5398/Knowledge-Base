import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, FileText } from "lucide-react";

export default function TrashLoading() {
  return (
    <div className="p-6 sm:p-8 max-w-4xl w-full mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      <div className="rounded-xl border bg-card/70 divide-y overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="rounded-md border bg-muted/60 p-2">
                <FileText className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-4 w-20" />
            <div className="flex gap-1">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
