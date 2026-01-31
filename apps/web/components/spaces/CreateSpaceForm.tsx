"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Plus } from "lucide-react";

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
      setError(err instanceof Error ? err.message : "Tạo thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <h2 className="font-semibold mb-4 flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Tạo space mới
      </h2>
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
          {error}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slug) setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
          }}
          placeholder="Tên space"
          className="flex-1"
        />
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="slug"
          className="sm:w-40 font-mono"
        />
        <button type="submit" disabled={loading} className="btn-primary shrink-0">
          {loading ? "Đang tạo..." : "Tạo"}
        </button>
      </div>
    </form>
  );
}
