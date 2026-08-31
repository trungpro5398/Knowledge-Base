"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { MarkdownEditor } from "./MarkdownEditor";
import { AttachmentUpload } from "./AttachmentUpload";
import { PageActionsToolbar } from "@/components/admin/PageActionsToolbar";
import { api } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useShortcuts } from "@/components/keyboard/shortcuts-provider";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { ApiResponse, PageVersionSummary } from "@/lib/api/types";
import { toast } from "sonner";

const VersionHistoryModal = dynamic(
  () => import("./version-history-modal").then((module) => module.VersionHistoryModal),
  { ssr: false }
);

interface EditorShellProps {
  pageId: string;
  spaceId: string;
  spaceSlug?: string;
  pagePath: string;
  initialTitle: string;
  initialContent: string;
  initialStatus: string;
  updatedAt?: string;
}

export function EditorShell({
  pageId,
  spaceId,
  spaceSlug = "",
  pagePath,
  initialTitle,
  initialContent,
  initialStatus,
  updatedAt,
}: EditorShellProps) {
  const [title, setTitle] = useState(initialTitle);
  const [editorValue, setEditorValue] = useState(initialContent);
  const [editorRevision, setEditorRevision] = useState(0);
  const [contentDirty, setContentDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const lastSavedContentRef = useRef(initialContent);
  const lastSavedTitleRef = useRef(initialTitle);
  const contentRef = useRef(initialContent);
  const titleRef = useRef(initialTitle);
  const saveInFlightRef = useRef(false);
  const queuedSaveRef = useRef(false);
  const publishingRef = useRef(false);
  const saveDraftRef = useRef<(mode?: "manual" | "auto") => Promise<void>>(() => Promise.resolve());
  const { t } = useLocale();
  const { registerShortcut, unregisterShortcut } = useShortcuts();
  titleRef.current = title;
  const isDirty =
    contentDirty || title !== lastSavedTitleRef.current;

  const handleContentChange = useCallback((nextContent: string) => {
    contentRef.current = nextContent;
    setContentDirty(nextContent !== lastSavedContentRef.current);
  }, []);

  const saveDraft = useCallback(async (mode: "manual" | "auto" = "auto") => {
    if (saveInFlightRef.current) {
      queuedSaveRef.current = true;
      return;
    }

    const contentToSave = contentRef.current;
    const titleToSave = titleRef.current;
    const contentChanged = contentToSave !== lastSavedContentRef.current;
    const titleChanged = titleToSave !== lastSavedTitleRef.current;

    if (!contentChanged && !titleChanged) return;

    saveInFlightRef.current = true;
    setSaving(true);
    try {
      await Promise.all([
        titleChanged
          ? api.patch(`/api/pages/${pageId}`, { title: titleToSave })
          : Promise.resolve(),
        contentChanged
          ? api.post(`/api/pages/${pageId}/versions`, {
              content_md: contentToSave,
              summary: mode === "auto" ? "Auto-save" : "Manual save",
              draft_update: mode === "auto",
            })
          : Promise.resolve(),
      ]);
      if (contentChanged) {
        lastSavedContentRef.current = contentToSave;
        if (contentRef.current === contentToSave) setContentDirty(false);
      }
      if (titleChanged) lastSavedTitleRef.current = titleToSave;
      setSavedAt(new Date());
      if (mode === "manual") {
        toast.success(contentChanged ? t("page.saveDraftSuccess") : t("page.saveTitleSuccess"));
      }
    } catch (e) {
      console.error(e);
      if (mode === "manual") {
        toast.error(t("page.saveFailed"));
      }
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
      if (queuedSaveRef.current) {
        queuedSaveRef.current = false;
        queueMicrotask(() => void saveDraftRef.current("auto"));
      }
    }
  }, [pageId, t]);

  useEffect(() => {
    saveDraftRef.current = saveDraft;
  }, [saveDraft]);

  const publish = useCallback(async () => {
    if (publishingRef.current) return;
    if (saveInFlightRef.current) {
      toast.info(t("page.saveInProgress"));
      return;
    }

    const contentToPublish = contentRef.current;
    const titleToPublish = titleRef.current;
    publishingRef.current = true;
    setPublishing(true);
    try {
      const [, versionRes] = await Promise.all([
        titleToPublish !== lastSavedTitleRef.current
          ? api.patch(`/api/pages/${pageId}`, { title: titleToPublish })
          : Promise.resolve(),
        api.post<ApiResponse<PageVersionSummary>>(
          `/api/pages/${pageId}/versions`,
          { content_md: contentToPublish, summary: "Published" }
        ),
      ]);
      const versionId = versionRes.data.id;
      await api.post(`/api/pages/${pageId}/publish`, { version_id: versionId });
      setStatus("published");
      lastSavedContentRef.current = contentToPublish;
      lastSavedTitleRef.current = titleToPublish;
      if (contentRef.current === contentToPublish) setContentDirty(false);
      setSavedAt(new Date());
      toast.success(t("page.publishSuccess"));
    } catch (e) {
      console.error(e);
      toast.error(t("page.publishFailed"));
    } finally {
      publishingRef.current = false;
      setPublishing(false);
    }
  }, [pageId, t]);

  // Register keyboard shortcuts
  useEffect(() => {
    registerShortcut({
      key: "s",
      meta: true,
      description: "Save draft",
      descriptionKey: "shortcuts.saveDraft",
      action: () => saveDraft("manual"),
      category: "Editor",
      categoryKey: "shortcuts.category.editor",
    });

    registerShortcut({
      key: "Enter",
      meta: true,
      description: "Publish page",
      descriptionKey: "shortcuts.publishPage",
      action: publish,
      category: "Editor",
      categoryKey: "shortcuts.category.editor",
    });

    return () => {
      unregisterShortcut("s");
      unregisterShortcut("Enter");
    };
  }, [publish, registerShortcut, saveDraft, unregisterShortcut]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const saveManually = useCallback(() => {
    void saveDraft("manual");
  }, [saveDraft]);

  const openVersionHistory = useCallback(() => {
    setShowHistory(true);
  }, []);

  return (
    <div className="space-y-4">
      {/* Sticky Actions Toolbar */}
      <PageActionsToolbar
        pageId={pageId}
        spaceId={spaceId}
        spaceSlug={spaceSlug}
        pagePath={pagePath}
        status={status as "draft" | "published" | "archived"}
        saving={saving}
        savedAt={savedAt}
        onSave={saveManually}
        onPublish={publish}
        onShowHistory={openVersionHistory}
        publishing={publishing}
      />

      {/* Title Input */}
      <div className="space-y-2">
        <label htmlFor="page-title-input" className="sr-only">
          {t("common.pageTitle")}
        </label>
        <input
          id="page-title-input"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl font-bold w-full bg-transparent border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background placeholder:text-muted-foreground/50 rounded-md px-1 -mx-1"
          placeholder={t("common.pageTitlePlaceholder")}
          autoComplete="off"
        />
      </div>

      {/* Attachments */}
      <div className="flex items-center gap-3">
        <AttachmentUpload pageId={pageId} />
      </div>

      {/* Markdown Editor */}
      <MarkdownEditor
        key={editorRevision}
        value={editorValue}
        onChange={handleContentChange}
        onDebouncedSave={() => saveDraft("auto")}
        debounceMs={2000}
        pageId={pageId}
      />

      {/* Version History Modal */}
      {showHistory && (
        <VersionHistoryModal
          pageId={pageId}
          currentContent={contentRef.current}
          onRestore={(restoredContent) => {
            contentRef.current = restoredContent;
            setEditorValue(restoredContent);
            setEditorRevision((revision) => revision + 1);
            setContentDirty(restoredContent !== lastSavedContentRef.current);
            setShowHistory(false);
          }}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
