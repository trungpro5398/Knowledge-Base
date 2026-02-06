"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import type { ApiResponse, Space } from "@/lib/api/types";
import { generateSlug } from "@/lib/utils";
import { toast } from "sonner";
import { useLocale } from "@/lib/i18n/locale-provider";

interface SpaceWithOrg extends Space {
  organization_id?: string | null;
}

interface ManageSpacesButtonProps {
  organizationId: string;
  organizationName: string;
  firstSpaceId?: string;
}

export function ManageSpacesButton({
  organizationId,
  organizationName,
  firstSpaceId,
}: ManageSpacesButtonProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const createInitialSpace = async (): Promise<SpaceWithOrg> => {
    const baseName = organizationName.trim() || "New Space";
    const baseSlug = generateSlug(baseName) || "new-space";
    let lastError: unknown = null;

    for (let i = 0; i < 5; i += 1) {
      const slug = i === 0 ? baseSlug : `${baseSlug}-${i + 1}`;
      try {
        const res = await apiClient<ApiResponse<SpaceWithOrg>>("/api/spaces", {
          method: "POST",
          body: {
            name: baseName,
            slug,
            organization_id: organizationId,
          },
        });
        return res.data;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        if (!message.includes("slug")) {
          throw error;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(t("space.createErrorDefault"));
  };

  const handleManageSpaces = async () => {
    if (loading) return;

    if (firstSpaceId) {
      router.push(`/admin/spaces/${firstSpaceId}`);
      return;
    }

    setLoading(true);
    try {
      const createdSpace = await createInitialSpace();
      toast.success(t("space.createdSuccess"), { description: createdSpace.name });
      router.push(`/admin/spaces/${createdSpace.id}`);
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("space.createErrorDefault");
      toast.error(t("space.createFailed"), { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleManageSpaces}
      disabled={loading}
      className="btn-primary h-9 px-3 text-sm gap-2 disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {t("admin.manageSpaces")}
    </button>
  );
}
