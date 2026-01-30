"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";

interface NewPageFormProps {
  spaceId: string;
}

export function NewPageForm({ spaceId }: NewPageFormProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiClient("/api/pages", {
        method: "POST",
        body: JSON.stringify({
          space_id: spaceId,
          title: title || "Untitled",
          slug: slug || "untitled",
        }),
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
