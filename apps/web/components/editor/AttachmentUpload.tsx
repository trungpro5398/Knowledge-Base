"use client";

import { memo, useState, useRef } from "react";
import { Paperclip } from "lucide-react";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import { ATTACHMENT_INPUT_ACCEPT, validateAttachmentFile } from "@/lib/attachments/validation";

interface AttachmentUploadProps {
  pageId: string;
  onUploaded?: () => void;
}

export const AttachmentUpload = memo(function AttachmentUpload({ pageId, onUploaded }: AttachmentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadInFlightRef = useRef(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateAttachmentFile(file);
    if (validationError) {
      toast.error("Không thể tải tệp", { description: validationError });
      e.target.value = "";
      return;
    }
    if (uploadInFlightRef.current) {
      toast.info("Một tệp đang được tải lên.");
      e.target.value = "";
      return;
    }
    uploadInFlightRef.current = true;
    setUploading(true);
    try {
      const supabasePromise = import("@/lib/auth/supabase-browser").then(({ createClient }) =>
        createClient()
      );
      const pathRes = await api.post<{ data: { path: string } }>(
        `/api/pages/${pageId}/attachments/upload-path`,
        {
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
        }
      );
      const path = pathRes.data.path;

      const supabase = await supabasePromise;
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
      uploadInFlightRef.current = false;
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
        accept={ATTACHMENT_INPUT_ACCEPT}
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
});
