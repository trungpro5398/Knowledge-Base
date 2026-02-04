import { Skeleton } from "@/components/ui/skeleton";

export default function PageEditorLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Title skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 flex-1 max-w-2xl" />
        <Skeleton className="h-9 w-24" />
      </div>
      {/* Editor content skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[95%]" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
