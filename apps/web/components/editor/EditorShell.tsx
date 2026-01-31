"use client";

import { useState } from "react";
import { MarkdownEditor } from "./MarkdownEditor";
import { AttachmentUpload } from "./AttachmentUpload";
import { api } from "@/lib/api/client";
import { Save, Send } from "lucide-react";
import type { ApiResponse, PageVersion } from "@/lib/api/types";

interface EditorShellProps {
  pageId: string;
  spaceId: string;
  initialTitle: string;
  initialContent: string;
  initialStatus: string;
}

export function EditorShell({
  pageId,
  spaceId,
  initialTitle,
  initialContent,
  initialStatus,
}: EditorShellProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const saveDraft = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/pages/${pageId}`, { title });
      await api.post(`/api/pages/${pageId}/versions`, {
        content_md: content,
        summary: "Auto-save",
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      const versionRes = await api.post<ApiResponse<PageVersion>>(
        `/api/pages/${pageId}/versions`,
        { content_md: content, summary: "Published" }
      );
      const versionId = versionRes.data.id;
      await api.post(`/api/pages/${pageId}/publish`, { version_id: versionId });
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-start">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-xl font-bold flex-1 min-w-[200px]"
          placeholder="Tiêu đề trang"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={saveDraft}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border font-medium hover:bg-muted disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? "Đang lưu..." : "Lưu nháp"}
          </button>
          <button
            onClick={publish}
            disabled={publishing || initialStatus === "published"}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {publishing ? "Đang xuất bản..." : "Xuất bản"}
          </button>
          <AttachmentUpload pageId={pageId} />
        </div>
      </div>
      <MarkdownEditor
        value={content}
        onChange={setContent}
        onDebouncedSave={saveDraft}
        debounceMs={2000}
      />
    </div>
  );
}
