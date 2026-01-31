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
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <h1 className="text-xl font-bold">New page</h1>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {templates.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1">From template (optional)</label>
          <select
            value={templateId}
            onChange={(e) => {
              setTemplateId(e.target.value);
              const t = templates.find((x) => x.id === e.target.value);
              if (t && !title) setTitle(t.name);
              if (t && !slug) setSlug(t.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_/]/g, ""));
            }}
            className="w-full px-3 py-2 border rounded bg-background"
          >
            <option value="">— None —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!slug) setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
          }}
          className="w-full px-3 py-2 border rounded bg-background"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Slug</label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full px-3 py-2 border rounded bg-background font-mono"
          placeholder="page-slug"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
