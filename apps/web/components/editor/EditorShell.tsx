"use client";

import { useState } from "react";
import { MarkdownEditor } from "./MarkdownEditor";
import { AttachmentUpload } from "./AttachmentUpload";
import { apiClient } from "@/lib/api/client";

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
      await apiClient(`/api/pages/${pageId}`, {
        method: "PATCH",
        body: JSON.stringify({ title }),
      });
      await apiClient(`/api/pages/${pageId}/versions`, {
        method: "POST",
        body: JSON.stringify({ content_md: content, summary: "Auto-save" }),
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
      const versionRes = await apiClient(`/api/pages/${pageId}/versions`, {
        method: "POST",
        body: JSON.stringify({ content_md: content, summary: "Published" }),
      });
      const versionId = versionRes.data.id;
      await apiClient(`/api/pages/${pageId}/publish`, {
        method: "POST",
        body: JSON.stringify({ version_id: versionId }),
      });
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-xl font-bold px-2 py-1 border rounded bg-background flex-1"
          placeholder="Title"
        />
        <button
          onClick={saveDraft}
          disabled={saving}
          className="px-4 py-2 border rounded hover:bg-muted disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save draft"}
        </button>
        <button
          onClick={publish}
          disabled={publishing || initialStatus === "published"}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
        >
          {publishing ? "Publishing..." : "Publish"}
        </button>
        <AttachmentUpload pageId={pageId} />
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
