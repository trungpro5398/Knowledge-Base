"use client";

import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { toast } from "sonner";
import type { ApiResponse, Space } from "@/lib/api/types";

interface EditSpaceFormProps {
  space: Pick<Space, "id" | "name" | "slug" | "description">;
}

export function EditSpaceForm({ space }: EditSpaceFormProps) {
  const { t } = useLocale();
  const [name, setName] = useState(space.name);
  const [slug, setSlug] = useState(space.slug);
  const [description, setDescription] = useState(space.description ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const nextName = name.trim();
    const nextSlug = slug.trim();

    if (!nextName || !nextSlug) {
      setError(t("space.editRequired"));
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.patch<ApiResponse<Space>>(`/api/spaces/${space.id}`, {
        name: nextName,
        slug: nextSlug,
        description: description.trim() || null,
      });
      setName(response.data.name);
      setSlug(response.data.slug);
      setDescription(response.data.description ?? "");
      toast.success(t("space.updatedSuccess"), { description: response.data.name });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("space.updateErrorDefault");
      setError(message);
      toast.error(t("space.updateFailed"), { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-xl border bg-card/70 p-5 md:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">{t("space.editTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("space.editDescription")}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="edit-space-name" className="block text-sm font-medium">
            {t("space.nameLabel")}
          </label>
          <input
            id="edit-space-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full"
            autoComplete="off"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-space-description" className="block text-sm font-medium">
            {t("space.descriptionLabel")}
          </label>
          <textarea
            id="edit-space-description"
            name="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-24 w-full resize-y"
            placeholder={t("space.descriptionPlaceholder")}
            autoComplete="off"
            maxLength={500}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-space-slug" className="block text-sm font-medium">
            {t("common.urlSlug")}
          </label>
          <input
            id="edit-space-slug"
            name="slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className="w-full font-mono text-sm"
            autoComplete="off"
            spellCheck={false}
            pattern="[a-z0-9-]+"
            required
          />
          <p className="text-xs text-muted-foreground">
            {t("space.publicUrlHint", { slug: slug || "..." })}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {t("space.slugChangeWarning")}
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="btn-primary inline-flex items-center gap-2"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          {isSaving ? t("space.saving") : t("space.saveChanges")}
        </button>
      </form>
    </section>
  );
}
