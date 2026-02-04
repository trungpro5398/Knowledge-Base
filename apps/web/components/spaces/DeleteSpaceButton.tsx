"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DeleteSpaceButtonProps {
  spaceId: string;
  spaceName: string;
  pageCount?: number;
  className?: string;
}

export function DeleteSpaceButton({
  spaceId,
  spaceName,
  pageCount = 0,
  className,
}: DeleteSpaceButtonProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isInsideSpace = pathname.includes(`/admin/spaces/${spaceId}`);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/api/spaces/${spaceId}`);
      toast.success("Đã xóa space", { description: spaceName });
      setShowConfirm(false);
      router.refresh();
      if (isInsideSpace) {
        router.push("/admin");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xóa thất bại. Thử lại.";
      toast.error("Xóa space thất bại", { description: msg });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors rounded-lg",
          className
        )}
        aria-label={`Xóa space ${spaceName}`}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">Xóa</span>
      </button>

      {showConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => !isDeleting && setShowConfirm(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-space-title"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4 p-6 bg-card rounded-xl shadow-xl border border-border"
          >
            <h2 id="delete-space-title" className="text-lg font-semibold text-destructive">
              Xóa space vĩnh viễn?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Space <strong>{spaceName}</strong> và tất cả {pageCount} trang sẽ bị xóa vĩnh viễn.
              Không thể khôi phục.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => !isDeleting && setShowConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xóa…
                  </>
                ) : (
                  "Xóa vĩnh viễn"
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
