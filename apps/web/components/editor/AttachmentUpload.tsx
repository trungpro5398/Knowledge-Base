"use client";

import { useState, useRef } from "react";
import { apiClient } from "@/lib/api/client";

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
      const token = await (await import("@/lib/api/auth")).getAccessToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/pages/${pageId}/attachments`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      );
      if (!res.ok) throw new Error("Upload failed");
      onUploaded?.();
    } catch {
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
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-sm px-2 py-1 border rounded hover:bg-muted disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload file"}
      </button>
    </div>
  );
}
