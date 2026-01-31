"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { getTemplates, type PageTemplate } from "@/lib/api/pages";

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
  const router = useRouter();

  useEffect(() => {
    getTemplates(spaceId).then(setTemplates).catch(() => setTemplates([]));
  }, [spaceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body: { space_id: string; title: string; slug: string; template_id?: string } = {
        space_id: spaceId,
        title: title || "Untitled",
        slug: slug || "untitled",
      };
      if (templateId) body.template_id = templateId;
      const res = await apiClient("/api/pages", {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.push(`/admin/spaces/${spaceId}/pages/${res.data.id}/edit`);
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
              if (t && !title) setTitle(t.name);
              if (t && !slug)
                setSlug(t.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_/]/g, ""));
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
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slug) setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
          }}
          placeholder="Tiêu đề trang"
          className="w-full"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Slug</label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full font-mono"
          placeholder="page-slug"
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Đang tạo..." : "Tạo trang"}
      </button>
    </form>
  );
}
