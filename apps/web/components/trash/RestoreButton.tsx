"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export function RestoreButton({ pageId }: { pageId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const restore = async () => {
    setLoading(true);
    try {
      await apiClient(`/api/trash/${pageId}/restore`, { method: "POST" });
      toast.success("Đã khôi phục trang");
      router.refresh();
    } catch {
      toast.error("Khôi phục thất bại");
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={restore}
      disabled={loading}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-emerald-200/60 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 transition-colors disabled:opacity-50"
      title="Khôi phục"
      aria-label="Khôi phục"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="sr-only">Khôi phục</span>
    </button>
  );
}
