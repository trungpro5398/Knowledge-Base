"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";

export function CreateSpaceForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiClient("/api/spaces", {
        method: "POST",
        body: JSON.stringify({ name: name || "New Space", slug: slug || "new-space" }),
      });
      router.refresh();
      setName("");
      setSlug("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded mb-6">
      <h2 className="font-semibold mb-2">Create space</h2>
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slug) setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
          }}
          placeholder="Space name"
          className="px-2 py-1 border rounded bg-background flex-1"
        />
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="slug"
          className="px-2 py-1 border rounded bg-background w-32 font-mono"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-1 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
        >
          Create
        </button>
      </div>
    </form>
  );
}
