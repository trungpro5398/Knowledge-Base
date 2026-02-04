"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/lib/i18n/locale-provider";

export function DeleteButton({ pageId }: { pageId: string }) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const destroy = async () => {
    if (loading) return;
    const confirmed = window.confirm(t("trash.deletePermanentConfirm"));
    if (!confirmed) return;
    setLoading(true);
    try {
      await apiClient(`/api/trash/${pageId}`, { method: "DELETE" });
      toast.success(t("trash.deletePermanentSuccess"));
      router.refresh();
    } catch {
      toast.error(t("trash.deletePermanentFailed"));
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={destroy}
      disabled={loading}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
      title={t("trash.deletePermanent")}
      aria-label={t("trash.deletePermanent")}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      )}
      <span className="sr-only">{t("trash.deletePermanent")}</span>
    </button>
  );
}
