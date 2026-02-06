"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { generateSlug } from "@/lib/utils";
import { toast } from "sonner";
import { useLocale } from "@/lib/i18n/locale-provider";

interface CreateSpaceFormProps {
  organizationId?: string;
}

export function CreateSpaceForm({ organizationId }: CreateSpaceFormProps) {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [manualSlug, setManualSlug] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const derivedSlug = name.trim() ? generateSlug(name) : "";
  const slugPreview = slug || derivedSlug || t("space.defaultSlug");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const finalName = name || t("space.defaultName");
      const finalSlug = slug || generateSlug(finalName) || t("space.defaultSlug");
      await apiClient("/api/spaces", {
        method: "POST",
        body: {
          name: finalName,
          slug: finalSlug,
          ...(organizationId && { organization_id: organizationId }),
        },
      });
      toast.success(t("space.createdSuccess"), { description: finalName });
      router.refresh();
      setName("");
      setSlug("");
      setManualSlug(false);
      setShowAdvanced(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("space.createErrorDefault");
      setError(message);
      toast.error(t("space.createFailed"), { description: message });
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
            {t("space.createTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("space.createDesc")}
          </p>
        </div>
      </div>
      {error && (
        <div id="create-space-error" className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm mt-4" role="status" aria-live="polite">
          {error}
        </div>
      )}
      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <label htmlFor="space-name" className="block text-sm font-medium">{t("space.nameLabel")}</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="space-name"
              name="name"
              ref={nameRef}
              value={name}
              onChange={(e) => {
              const value = e.target.value;
              setName(value);
              // Tự sinh slug từ tên nếu user chưa sửa slug thủ công
              if (!manualSlug) {
                const nextSlug = value.trim() ? generateSlug(value) : "";
                setSlug(nextSlug);
              }
            }}
              placeholder={t("space.namePlaceholder")}
              className="flex-1"
              autoComplete="off"
              aria-invalid={!!error}
              aria-describedby={error ? "create-space-error" : undefined}
            />
            <button type="submit" disabled={loading} className="btn-primary shrink-0">
              {loading ? t("space.creating") : t("space.createButton")}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("common.publicUrl")}:{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded">/kb/{slugPreview}</code>
          </p>
        </div>

        {/* Tùy chọn nâng cao: chỉnh slug */}
        <div className="border-t pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
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
              <label htmlFor="space-slug" className="block font-medium">{t("common.urlSlug")}</label>
              <input
                id="space-slug"
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setManualSlug(true);
                }}
                placeholder={t("space.slugPlaceholder")}
                className="w-full font-mono text-xs sm:text-sm"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">{t("common.currentUrl")}:</span>{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded">
                  /kb/{slugPreview}
                </code>
              </p>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
