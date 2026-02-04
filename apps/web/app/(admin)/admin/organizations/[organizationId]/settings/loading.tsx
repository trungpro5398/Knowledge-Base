import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

export default function OrganizationSettingsLoading() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="border rounded-lg divide-y">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
