"use client";

import { useState, useRef, useEffect } from "react";
import { MarkdownEditor } from "./MarkdownEditor";
import { AttachmentUpload } from "./AttachmentUpload";
import { VersionHistoryModal } from "./version-history-modal";
import { PageActionsToolbar } from "@/components/admin/PageActionsToolbar";
import { api } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useShortcuts } from "@/components/keyboard/shortcuts-provider";
import type { ApiResponse, PageVersion } from "@/lib/api/types";

function contentHash(s: string): string {
  return `${s.length}:${s.slice(0, 100)}:${s.slice(-100)}`;
}

interface EditorShellProps {
  pageId: string;
  spaceId: string;
  spaceSlug?: string;
  initialTitle: string;
  initialContent: string;
  initialStatus: string;
  updatedAt?: string;
}

export function EditorShell({
  pageId,
  spaceId,
  spaceSlug = "",
  initialTitle,
  initialContent,
  initialStatus,
  updatedAt,
}: EditorShellProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [status, setStatus] = useState(initialStatus);
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
      setStatus("published");
      setSavedAt(new Date());
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
        if (status !== "published") publish();
      },
      category: "Editor",
    });

    return () => {
      unregisterShortcut("s");
      unregisterShortcut("Enter");
    };
  }, [content, title, status]);

  return (
    <div className="space-y-4">
      {/* Sticky Actions Toolbar */}
      <PageActionsToolbar
        pageId={pageId}
        spaceId={spaceId}
        spaceSlug={spaceSlug}
        status={status as "draft" | "published" | "archived"}
        saving={saving}
        savedAt={savedAt}
        onSave={saveDraft}
        onPublish={publish}
        onShowHistory={() => setShowHistory(true)}
        publishing={publishing}
      />

      {/* Title Input */}
      <div className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl font-bold w-full bg-transparent border-none focus:ring-0 focus:outline-none placeholder:text-muted-foreground/50"
          placeholder="Page title..."
        />
      </div>

      {/* Attachments */}
      <div className="flex items-center gap-3">
        <AttachmentUpload pageId={pageId} />
      </div>

      {/* Markdown Editor */}
      <MarkdownEditor
        value={content}
        onChange={setContent}
        onDebouncedSave={saveDraft}
        debounceMs={1200}
        pageId={pageId}
      />

      {/* Version History Modal */}
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

