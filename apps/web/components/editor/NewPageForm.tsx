"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api/client";
import { generateSlug } from "@/lib/utils";
import { getTemplates, type PageTemplate } from "@/lib/api/pages";
import type { ApiResponse, Page } from "@/lib/api/types";
import { toast } from "sonner";
import { useLocale } from "@/lib/i18n/locale-provider";

interface NewPageFormProps {
  spaceId: string;
  parentId?: string;
}

export function NewPageForm({ spaceId, parentId }: NewPageFormProps) {
  const { t } = useLocale();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualSlug, setManualSlug] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const derivedSlug = title.trim() ? generateSlug(title) : "";
  const slugPreview = slug || derivedSlug || "duong-dan-trang";

  useEffect(() => {
    getTemplates(spaceId).then(setTemplates).catch(() => setTemplates([]));
  }, [spaceId]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    // Auto-generate slug only if user hasn't manually edited it
    if (!manualSlug) {
      const nextSlug = newTitle.trim() ? generateSlug(newTitle) : "";
      setSlug(nextSlug);
    }
  };

  const handleSlugChange = (newSlug: string) => {
    setSlug(newSlug);
    setManualSlug(true); // Mark that user has manually edited slug
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body: {
        space_id: string;
        title: string;
        slug: string;
        template_id?: string;
        parent_id?: string | null;
      } = {
        space_id: spaceId,
        title: title || "Untitled",
        slug: slug || generateSlug(title) || "untitled",
      };
      if (parentId) body.parent_id = parentId;
      if (templateId) body.template_id = templateId;
      const res = await api.post<ApiResponse<Page>>("/api/pages", body);
      toast.success(t("page.createdSuccess"), { description: body.title });
      router.refresh();
      router.push(`/admin/spaces/${spaceId}/${res.data.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("page.createErrorDefault");
      setError(message);
      toast.error(t("page.createFailed"), { description: message });
      titleRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-card/70 p-6 max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t("page.createTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("page.createDesc")}
        </p>
      </div>
      {error && (
        <div id="new-page-error" className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm" role="status" aria-live="polite">
          {error}
        </div>
      )}
      {templates.length > 0 && (
        <div>
        <label htmlFor="page-template" className="block text-sm font-medium mb-2">{t("page.fromTemplate")}</label>
        <select
          id="page-template"
          name="template"
          value={templateId}
            onChange={(e) => {
              setTemplateId(e.target.value);
              const t = templates.find((x) => x.id === e.target.value);
              if (t && !title) {
                setTitle(t.name);
                setSlug(generateSlug(t.name));
              }
            }}
            className="w-full"
          >
            <option value="">{t("page.noTemplate")}</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="page-title" className="block text-sm font-medium mb-2">{t("page.titleLabel")}</label>
        <input
          id="page-title"
          name="title"
          ref={titleRef}
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder={t("page.titlePlaceholder")}
          className="w-full"
          autoComplete="off"
          aria-invalid={!!error}
          aria-describedby={error ? "new-page-error" : undefined}
        />
        <p className="text-xs text-muted-foreground mt-2">
          {t("page.slugAuto")}:{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded">{slugPreview}</code>
        </p>
      </div>

      {/* Advanced section - collapsed by default */}
      <div className="border-t pt-4">
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
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="page-slug" className="block text-sm font-medium mb-2">
                {t("common.urlSlug")}
              </label>
              <div className="space-y-2">
                <input
                  id="page-slug"
                  name="slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="w-full font-mono text-sm"
                  placeholder={t("page.slugPlaceholder")}
                  autoComplete="off"
                  spellCheck={false}
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium">{t("page.urlExample")}:</span>{" "}
                    <code className="bg-muted px-1.5 py-0.5 rounded">
                      /kb/&lt;space&gt;/{slugPreview}
                    </code>
                  </p>
                  <p className="text-amber-600 dark:text-amber-500">
                    ⚠️ {t("page.slugWarning")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end">
        <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto">
          {loading ? t("page.creating") : t("page.createButton")}
        </button>
      </div>
    </form>
  );
}
