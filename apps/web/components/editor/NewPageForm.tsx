"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api/client";
import { generateSlug } from "@/lib/utils";
import { getTemplates, type PageTemplate } from "@/lib/api/pages";
import type { ApiResponse, Page } from "@/lib/api/types";

interface NewPageFormProps {
  spaceId: string;
}

export function NewPageForm({ spaceId }: NewPageFormProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [templateId, setTemplateId] = useState<string>("");
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualSlug, setManualSlug] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getTemplates(spaceId).then(setTemplates).catch(() => setTemplates([]));
  }, [spaceId]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    // Auto-generate slug only if user hasn't manually edited it
    if (!manualSlug) {
      setSlug(generateSlug(newTitle));
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
      const body: { space_id: string; title: string; slug: string; template_id?: string } = {
        space_id: spaceId,
        title: title || "Untitled",
        slug: slug || generateSlug(title) || "untitled",
      };
      if (templateId) body.template_id = templateId;
      const res = await api.post<ApiResponse<Page>>("/api/pages", body);
      router.push(`/admin/spaces/${spaceId}/${res.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Tạo thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card max-w-lg space-y-5">
      <h1 className="text-xl font-bold">Trang mới</h1>
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      {templates.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2">Từ template (tùy chọn)</label>
          <select
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
            <option value="">— Không dùng —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-2">Tiêu đề</label>
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Ví dụ: Quy trình duyệt hóa đơn"
          className="w-full"
          autoFocus
        />
      </div>

      {/* Advanced section - collapsed by default */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          Tùy chọn nâng cao
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">
                Đường dẫn URL (slug)
              </label>
              <div className="space-y-2">
                <input
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="w-full font-mono text-sm"
                  placeholder="tu-dong-tao-tu-tieu-de"
                />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium">Ví dụ URL:</span>{" "}
                    <code className="bg-muted px-1.5 py-0.5 rounded">
                      /kb/tet-prosys/{slug || "duong-dan-trang"}
                    </code>
                  </p>
                  <p className="text-amber-600 dark:text-amber-500">
                    ⚠️ Thay đổi slug có thể làm hỏng link cũ
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Đang tạo..." : "Tạo trang"}
      </button>
    </form>
  );
}
