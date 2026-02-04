"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteButton({ pageId }: { pageId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const destroy = async () => {
    if (loading) return;
    const confirmed = window.confirm("Xóa vĩnh viễn trang này?");
    if (!confirmed) return;
    setLoading(true);
    try {
      await apiClient(`/api/trash/${pageId}`, { method: "DELETE" });
      toast.success("Đã xóa vĩnh viễn");
      router.refresh();
    } catch {
      toast.error("Xóa vĩnh viễn thất bại");
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={destroy}
      disabled={loading}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
      title="Xóa vĩnh viễn"
      aria-label="Xóa vĩnh viễn"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="sr-only">Xóa vĩnh viễn</span>
    </button>
  );
}
