"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Trash2 } from "lucide-react";
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
      onClick={destroy}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
      title="Xóa vĩnh viễn"
      aria-label="Xóa vĩnh viễn"
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      {loading ? "Đang xóa…" : "Xóa hẳn"}
    </button>
  );
}
