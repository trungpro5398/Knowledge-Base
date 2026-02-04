"use client";

import { useState, useRef } from "react";
import { Paperclip } from "lucide-react";
import { createClient } from "@/lib/auth/supabase-browser";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

interface AttachmentUploadProps {
  pageId: string;
  onUploaded?: () => void;
}

export function AttachmentUpload({ pageId, onUploaded }: AttachmentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const pathRes = await api.post<{ data: { path: string } }>(
        `/api/pages/${pageId}/attachments/upload-path`,
        {
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
        }
      );
      const path = pathRes.data.path;

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) throw new Error(uploadError.message);

      await api.post(`/api/pages/${pageId}/attachments/register`, {
        path,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      });
      onUploaded?.();
      toast.success("Đã tải tệp đính kèm", { description: file.name });
    } catch (err) {
      console.error(err);
      toast.error("Tải tệp thất bại", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setUploading(false);
    }
    e.target.value = "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        onChange={handleFile}
        className="hidden"
        accept="image/*,.pdf,.txt,.md"
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
      >
        <Paperclip className="h-4 w-4" aria-hidden="true" />
        {uploading ? "Đang tải…" : "Đính kèm"}
      </button>
    </div>
  );
}
