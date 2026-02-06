"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Plus,
  Search,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";
import { useLocale } from "@/lib/i18n/locale-provider";
import { cn, generateSlug } from "@/lib/utils";
import { toast } from "sonner";

interface Space {
  id: string;
  name: string;
  slug: string;
  organization_id?: string | null;
}

interface Organization {
  id: string;
  name: string;
  icon?: string | null;
}

interface SpaceSwitcherProps {
  spaces: Space[];
  organizations: Organization[];
  currentSpaceId?: string;
}

export function SpaceSwitcher({
  spaces,
  organizations,
  currentSpaceId,
}: SpaceSwitcherProps) {
  const { t } = useLocale();
  const router = useRouter();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceSlug, setNewSpaceSlug] = useState("");
  const [manualSlug, setManualSlug] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const currentSpace = spaces.find((space) => space.id === currentSpaceId);
  const derivedSlug = newSpaceName.trim() ? generateSlug(newSpaceName) : "";
  const finalSlug = newSpaceSlug.trim() || derivedSlug || t("space.defaultSlug");

  const spacesByOrg = spaces.reduce((acc, space) => {
    const orgId = space.organization_id || "standalone";
    if (!acc[orgId]) acc[orgId] = [];
    acc[orgId].push(space);
    return acc;
  }, {} as Record<string, Space[]>);

  const filteredSpaces = searchQuery
    ? spaces.filter((space) => {
        const query = searchQuery.toLowerCase();
        return (
          space.name.toLowerCase().includes(query) ||
          space.slug.toLowerCase().includes(query)
        );
      })
    : null;

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && showCreateForm) {
      requestAnimationFrame(() => nameInputRef.current?.focus());
    }
  }, [isOpen, showCreateForm]);

  const resetCreateForm = () => {
    setShowCreateForm(false);
    setNewSpaceName("");
    setNewSpaceSlug("");
    setManualSlug(false);
    setShowAdvanced(false);
    setCreateError("");
    setIsCreating(false);
  };

  const closePanel = () => {
    setIsOpen(false);
    setSearchQuery("");
    resetCreateForm();
  };

  const handleCreateSpace = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");

    const name = newSpaceName.trim();
    if (!name) {
      const message = t("space.createNameRequired");
      setCreateError(message);
      nameInputRef.current?.focus();
      return;
    }

    setIsCreating(true);

    try {
      const payload: {
        name: string;
        slug: string;
        organization_id?: string;
      } = {
        name,
        slug: finalSlug,
      };

      if (currentSpace?.organization_id) {
        payload.organization_id = currentSpace.organization_id;
      }

      const res = await apiClient<ApiResponse<Space>>("/api/spaces", {
        method: "POST",
        body: payload,
      });

      toast.success(t("space.createdSuccess"), { description: res.data.name });
      closePanel();
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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (isOpen) {
            closePanel();
            return;
          }
          setIsOpen(true);
        }}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
          "hover:bg-muted/50",
          isOpen && "bg-muted"
        )}
        aria-expanded={isOpen}
        aria-controls="space-switcher-panel"
        aria-haspopup="dialog"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
          <FolderOpen className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {currentSpace?.name || t("spaceSwitcher.selectSpace")}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {currentSpace ? `/kb/${currentSpace.slug}` : t("spaceSwitcher.noSpaceSelected")}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform shrink-0",
            isOpen && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            onClick={closePanel}
            aria-label={t("common.close")}
          />
          <div
            id="space-switcher-panel"
            role="dialog"
            aria-label={t("sidebar.spaces")}
            className="absolute left-0 top-full mt-2 z-50 w-72 rounded-lg border bg-card shadow-lg animate-fade-in overflow-hidden"
          >
            <div className="p-2 border-b">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  name="space-search"
                  placeholder={t("spaceSwitcher.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-background"
                  aria-label={t("spaceSwitcher.searchAria")}
                  autoComplete="off"
                  autoCapitalize="none"
                  inputMode="search"
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="max-h-[320px] overflow-y-auto p-2">
              {filteredSpaces ? (
                filteredSpaces.length > 0 ? (
                  <div className="space-y-1">
                    {filteredSpaces.map((space) => (
                      <SpaceItem
                        key={space.id}
                        space={space}
                        isActive={space.id === currentSpaceId}
                        onClick={closePanel}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {t("spaceSwitcher.noResults")}
                  </p>
                )
              ) : (
                <div className="space-y-4">
                  {organizations.map((org) => {
                    const orgSpaces = spacesByOrg[org.id] || [];
                    if (orgSpaces.length === 0) return null;

                    return (
                      <div key={org.id}>
                        <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {org.icon || <Building2 className="h-3 w-3" aria-hidden="true" />}
                          <span>{org.name}</span>
                        </div>
                        <div className="space-y-0.5 mt-1">
                          {orgSpaces.map((space) => (
                            <SpaceItem
                              key={space.id}
                              space={space}
                              isActive={space.id === currentSpaceId}
                              onClick={closePanel}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {spacesByOrg.standalone && spacesByOrg.standalone.length > 0 && (
                    <div>
                      <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t("spaceSwitcher.standalone")}
                      </div>
                      <div className="space-y-0.5 mt-1">
                        {spacesByOrg.standalone.map((space) => (
                          <SpaceItem
                            key={space.id}
                            space={space}
                            isActive={space.id === currentSpaceId}
                            onClick={closePanel}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-2 border-t space-y-2">
              {showCreateForm ? (
                <form onSubmit={handleCreateSpace} className="rounded-md border bg-muted/30 p-2.5 space-y-2">
                  <label htmlFor="switcher-space-name" className="sr-only">
                    {t("space.nameLabel")}
                  </label>
                  <input
                    id="switcher-space-name"
                    ref={nameInputRef}
                    name="switcher-space-name"
                    value={newSpaceName}
                    onChange={(event) => {
                      const value = event.target.value;
                      setNewSpaceName(value);
                      if (!manualSlug) {
                        setNewSpaceSlug(value.trim() ? generateSlug(value) : "");
                      }
                    }}
                    placeholder={t("space.namePlaceholder")}
                    className="w-full h-8 px-2 text-sm rounded-md border bg-background"
                    autoComplete="off"
                  />

                  <div className="border-t pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced((prev) => !prev)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showAdvanced ? (
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {t("common.advancedOptions")}
                    </button>
                    {showAdvanced && (
                      <div className="mt-2 space-y-1.5">
                        <label htmlFor="switcher-space-slug" className="sr-only">
                          {t("common.urlSlug")}
                        </label>
                        <input
                          id="switcher-space-slug"
                          name="switcher-space-slug"
                          value={newSpaceSlug}
                          onChange={(event) => {
                            setNewSpaceSlug(event.target.value);
                            setManualSlug(true);
                          }}
                          placeholder={t("space.slugPlaceholder")}
                          className="w-full h-8 px-2 text-xs rounded-md border bg-background font-mono"
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1.5">
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
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t("spaceSwitcher.createButton")}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SpaceItem({
  space,
  isActive,
  onClick,
}: {
  space: Space;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={`/admin/spaces/${space.id}`}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-muted"
      )}
    >
      <FolderOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate">{space.name}</span>
      {isActive && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
    </Link>
  );
}
