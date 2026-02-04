"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { RotateCcw } from "lucide-react";
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
      onClick={restore}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
      title="Khôi phục"
      aria-label="Khôi phục"
    >
      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
      {loading ? "Đang khôi phục…" : "Khôi phục"}
    </button>
  );
}
