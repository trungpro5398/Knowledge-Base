"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { generateSlug } from "@/lib/utils";

export function CreateSpaceForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [manualSlug, setManualSlug] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const finalName = name || "New Space";
      const finalSlug = slug || generateSlug(name) || "new-space";
      await apiClient("/api/spaces", {
        method: "POST",
        body: { name: finalName, slug: finalSlug },
      });
      router.refresh();
      setName("");
      setSlug("");
      setManualSlug(false);
      setShowAdvanced(false);
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
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={name}
            onChange={(e) => {
              const value = e.target.value;
              setName(value);
              // Tự sinh slug từ tên nếu user chưa sửa slug thủ công
              if (!manualSlug) {
                setSlug(generateSlug(value));
              }
            }}
            placeholder="Tên space (ví dụ: TET ProSys – Operation Manual)"
            className="flex-1"
          />
          <button type="submit" disabled={loading} className="btn-primary shrink-0">
            {loading ? "Đang tạo..." : "Tạo"}
          </button>
        </div>

        {/* Tùy chọn nâng cao: chỉnh slug */}
        <div className="border-t pt-3">
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
            <div className="mt-3 space-y-2 text-sm">
              <label className="block font-medium">Đường dẫn URL (slug)</label>
              <input
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setManualSlug(true);
                }}
                placeholder="tu-dong-tao-tu-ten-space"
                className="w-full font-mono text-xs sm:text-sm"
              />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Ví dụ URL public:</span>{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded">
                  /kb/{slug || "ten-space"}
                </code>
              </p>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
