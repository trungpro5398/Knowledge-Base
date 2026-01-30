"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";

export function RestoreButton({ pageId }: { pageId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const restore = async () => {
    setLoading(true);
    try {
      await apiClient(`/api/trash/${pageId}/restore`, { method: "POST" });
      router.refresh();
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={restore}
      disabled={loading}
      className="px-2 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50"
    >
      {loading ? "Restoring..." : "Restore"}
    </button>
  );
}
