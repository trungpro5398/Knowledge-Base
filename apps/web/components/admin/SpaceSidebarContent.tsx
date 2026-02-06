"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageTree, type TreeNode } from "@/components/kb/PageTree";
import { TET_PROSYS_GROUPS } from "@/lib/kb/sidebar-groups";
import { useLocale } from "@/lib/i18n/locale-provider";
import { cn, generateSlug } from "@/lib/utils";
import type { ApiResponse, Space } from "@/lib/api/types";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

interface SpaceWithOrg extends Space {
  organization_id?: string | null;
}

interface SpaceSidebarContentProps {
  spaceId: string;
  space: SpaceWithOrg;
  tree: TreeNode[];
  spaces: SpaceWithOrg[];
  useGroupedSidebar?: boolean;
  enableDragAndDrop?: boolean;
}

export function SpaceSidebarContent({
  spaceId,
  space,
  tree,
  spaces,
  useGroupedSidebar = false,
  enableDragAndDrop = true,
}: SpaceSidebarContentProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const derivedSlug = newSpaceName.trim() ? generateSlug(newSpaceName) : "";
  const finalSlug = customSlug.trim() || derivedSlug || "new-space";

  const handleCreateSpace = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");
    setIsCreating(true);

    try {
      const payload: {
        name: string;
        slug: string;
        organization_id?: string;
      } = {
        name: newSpaceName.trim() || "New Space",
        slug: finalSlug,
      };

      if (space.organization_id) {
        payload.organization_id = space.organization_id;
      }

      const res = await apiClient<ApiResponse<SpaceWithOrg>>("/api/spaces", {
        method: "POST",
        body: payload,
      });

      toast.success(t("space.createdSuccess"), { description: res.data.name });
      setNewSpaceName("");
      setCustomSlug("");
      setShowCreateForm(false);
      router.push(`/admin/spaces/${res.data.id}`);
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("space.createErrorDefault");
      setCreateError(message);
      toast.error(t("space.createFailed"), { description: message });
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setShowCreateForm(false);
    setNewSpaceName("");
    setCustomSlug("");
    setCreateError("");
  };

  return (
    <>
      <div className="p-4 border-b border-border/70">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("sidebar.spaces")}
          </span>
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("admin.create")}
          </button>
        </div>
        {showCreateForm && (
          <form onSubmit={handleCreateSpace} className="mt-3 rounded-lg border bg-muted/30 p-2.5 space-y-2">
            <label htmlFor="quick-space-name" className="sr-only">
              {t("space.nameLabel")}
            </label>
            <input
              id="quick-space-name"
              name="quick-space-name"
              value={newSpaceName}
              onChange={(event) => setNewSpaceName(event.target.value)}
              placeholder={t("space.namePlaceholder")}
              className="w-full h-8 px-2 text-sm rounded-md border bg-background"
              autoComplete="off"
            />

            <div className="space-y-1">
              <label htmlFor="quick-space-slug" className="sr-only">
                {t("common.urlSlug")}
              </label>
              <input
                id="quick-space-slug"
                name="quick-space-slug"
                value={customSlug}
                onChange={(event) => setCustomSlug(event.target.value)}
                placeholder={t("space.slugPlaceholder")}
                className="w-full h-8 px-2 text-xs rounded-md border bg-background font-mono"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-[10px] text-muted-foreground">
                /kb/{finalSlug}
              </p>
            </div>

            {createError && (
              <p className="text-[11px] text-destructive" role="alert">
                {createError}
              </p>
            )}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isCreating}
                className="h-8 px-2.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isCreating ? t("space.creating") : t("space.createButton")}
              </button>
              <button
                type="button"
                onClick={resetCreateForm}
                className="h-8 px-2.5 rounded-md border text-xs hover:bg-muted transition-colors"
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        )}
        <div className="mt-3 space-y-1">
          {spaces.map((item) => (
            <Link
              key={item.id}
              href={`/admin/spaces/${item.id}`}
              className={cn(
                "flex flex-col gap-0.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/60",
                item.id === space.id && "bg-primary/10 text-primary"
              )}
            >
              <span className="font-medium truncate">{item.name}</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                /kb/{item.slug}
              </span>
            </Link>
          ))}
        </div>
      </div>
      <div className="p-4">
        <PageTree
          spaceId={spaceId}
          spaceSlug={space.slug}
          nodes={tree}
          linkMode="admin"
          showEditLink={false}
          showCreateLink
          showCreateChild
          enableDragAndDrop={enableDragAndDrop}
          groupConfig={!enableDragAndDrop && useGroupedSidebar ? TET_PROSYS_GROUPS : undefined}
        />
      </div>
    </>
  );
}
