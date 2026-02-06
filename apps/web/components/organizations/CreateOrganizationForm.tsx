"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Plus, ChevronDown, ChevronUp, Building2 } from "lucide-react";
import { generateSlug } from "@/lib/utils";
import { toast } from "sonner";
import { useLocale } from "@/lib/i18n/locale-provider";

export function CreateOrganizationForm() {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [manualSlug, setManualSlug] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const derivedSlug = name.trim() ? generateSlug(name) : "";
  const slugPreview = slug || derivedSlug || "new-organization";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const finalName = name.trim() || "New Organization";
      const finalSlug = slug || generateSlug(name) || "new-organization";

      await apiClient("/api/organizations", {
        method: "POST",
        body: {
          name: finalName,
          slug: finalSlug,
          description: description.trim() || undefined,
        },
      });

      toast.success(t("organization.createdSuccess"), { description: finalName });
      router.refresh();
      setName("");
      setDescription("");
      setSlug("");
      setManualSlug(false);
      setShowAdvanced(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("organization.createErrorDefault");
      setError(message);
      toast.error(t("organization.createFailed"), { description: message });
      nameRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-card/70 p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("organization.createTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("organization.createDesc")}</p>
        </div>
      </div>

      {error && (
        <div
          id="create-organization-error"
          className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm mt-4"
          role="status"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <label htmlFor="organization-name" className="block text-sm font-medium">
            {t("organization.nameLabel")}
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="organization-name"
              name="name"
              ref={nameRef}
              value={name}
              onChange={(e) => {
                const value = e.target.value;
                setName(value);
                if (!manualSlug) {
                  setSlug(value.trim() ? generateSlug(value) : "");
                }
              }}
              placeholder={t("organization.namePlaceholder")}
              className="flex-1"
              autoComplete="off"
              aria-invalid={!!error}
              aria-describedby={error ? "create-organization-error" : undefined}
            />
            <button type="submit" disabled={loading} className="btn-primary shrink-0">
              {loading ? t("organization.creating") : t("organization.createButton")}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="organization-description" className="block text-sm font-medium">
            {t("organization.descriptionLabel")}
          </label>
          <textarea
            id="organization-description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("organization.descriptionPlaceholder")}
            className="w-full min-h-[84px] resize-y"
          />
        </div>

        <div className="border-t pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
            {t("common.advancedOptions")}
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-2 text-sm">
              <label htmlFor="organization-slug" className="block font-medium">
                {t("organization.slugLabel")}
              </label>
              <input
                id="organization-slug"
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setManualSlug(true);
                }}
                placeholder={t("organization.slugPlaceholder")}
                className="w-full font-mono text-xs sm:text-sm"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
        <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="font-medium">{t("organization.slugPreview")}:</span>
        <code className="bg-muted px-1.5 py-0.5 rounded">{slugPreview}</code>
      </div>
    </form>
  );
}
