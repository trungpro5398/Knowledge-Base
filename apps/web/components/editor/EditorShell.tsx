"use client";

import { useState, useRef, useEffect } from "react";
import { MarkdownEditor } from "./MarkdownEditor";
import { AttachmentUpload } from "./AttachmentUpload";
import { VersionHistoryModal } from "./version-history-modal";
import { api } from "@/lib/api/client";
import { Save, Send, Check, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useShortcuts } from "@/components/keyboard/shortcuts-provider";
import type { ApiResponse, PageVersion } from "@/lib/api/types";

function contentHash(s: string): string {
  return `${s.length}:${s.slice(0, 100)}:${s.slice(-100)}`;
}

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
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const lastSavedContentHash = useRef(contentHash(initialContent));
  const { registerShortcut, unregisterShortcut } = useShortcuts();

  const saveDraft = async () => {
    const hash = contentHash(content);
    if (hash === lastSavedContentHash.current) {
      const titleChanged = title !== initialTitle;
      if (titleChanged) {
        setSaving(true);
        try {
          await api.patch(`/api/pages/${pageId}`, { title });
          setSavedAt(new Date());
        } catch (e) {
          console.error(e);
        } finally {
          setSaving(false);
        }
      }
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/api/pages/${pageId}`, { title });
      await api.post(`/api/pages/${pageId}/versions`, {
        content_md: content,
        summary: "Auto-save",
      });
      lastSavedContentHash.current = hash;
      setSavedAt(new Date());
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

  // Register keyboard shortcuts
  useEffect(() => {
    registerShortcut({
      key: "s",
      meta: true,
      description: "Save draft",
      action: () => saveDraft(),
      category: "Editor",
    });

    registerShortcut({
      key: "Enter",
      meta: true,
      description: "Publish page",
      action: () => {
        if (initialStatus !== "published") publish();
      },
      category: "Editor",
    });

    return () => {
      unregisterShortcut("s");
      unregisterShortcut("Enter");
    };
  }, [content, title, initialStatus]); // Re-register when content changes

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
            {saving ? <Save className="h-4 w-4 animate-pulse" /> : savedAt ? <Check className="h-4 w-4 text-green-600" /> : <Save className="h-4 w-4" />}
            {saving ? "Đang lưu..." : savedAt ? "Đã lưu" : "Lưu nháp"}
          </button>
          <button
            onClick={publish}
            disabled={publishing || initialStatus === "published"}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {publishing ? "Đang xuất bản..." : "Xuất bản"}
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border font-medium hover:bg-muted transition-colors"
          >
            <History className="h-4 w-4" />
            History
          </button>
          <AttachmentUpload pageId={pageId} />
        </div>
      </div>
      <MarkdownEditor
        value={content}
        onChange={setContent}
        onDebouncedSave={saveDraft}
        debounceMs={1200}
        pageId={pageId}
      />
      {showHistory && (
        <VersionHistoryModal
          pageId={pageId}
          currentContent={content}
          onRestore={(restoredContent) => {
            setContent(restoredContent);
            setShowHistory(false);
          }}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
