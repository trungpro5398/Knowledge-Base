"use client";

import { useState, useCallback, useDeferredValue, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Undo2, Redo2 } from "lucide-react";
import { api } from "@/lib/api/client";
import { MarkdownToolbar } from "./markdown-toolbar";
import { HistoryStack } from "@/lib/editor/history-stack";
import { publicAttachmentUrl } from "@/lib/attachments/public-url";
import { validateAttachmentFile } from "@/lib/attachments/validation";

const MarkdownPreview = dynamic(
  () => import("./MarkdownPreview").then((module) => module.MarkdownPreview),
  {
    ssr: false,
    loading: () => <div className="animate-pulse text-muted-foreground">Loading preview…</div>,
  }
);

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onDebouncedSave?: () => void;
  debounceMs?: number;
  pageId?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  onDebouncedSave,
  debounceMs = 1200,
  pageId,
}: MarkdownEditorProps) {
  const [local, setLocal] = useState(value);
  const deferredLocal = useDeferredValue(local);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [history] = useState(() => {
    const stack = new HistoryStack(50);
    stack.initialize(value);
    return stack;
  });
  const lastEmittedValueRef = useRef(value);
  const sourcePageIdRef = useRef(pageId);
  const lastPushRef = useRef<number>(0);
  const uploadInFlightRef = useRef(false);

  useEffect(() => {
    // Parent echoes are caused by this editor's own onChange call. Resetting
    // history for those values discarded undo state and added work per keypress.
    if (sourcePageIdRef.current === pageId && value === lastEmittedValueRef.current) return;
    sourcePageIdRef.current = pageId;
    setLocal(value);
    history.initialize(value);
    lastEmittedValueRef.current = value;
    lastPushRef.current = 0;
  }, [history, pageId, value]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
  }, []);

  const triggerSave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onDebouncedSave?.();
    }, debounceMs);
  }, [onDebouncedSave, debounceMs]);

  const updateContent = useCallback((nextValue: string) => {
    setLocal(nextValue);
    lastEmittedValueRef.current = nextValue;
    onChange(nextValue);
  }, [onChange]);

  const focusCursorAt = useCallback((position: number) => {
    if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
    cursorTimerRef.current = setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(position, position);
      cursorTimerRef.current = undefined;
    }, 0);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    updateContent(v);
    triggerSave();

    // Push to history stack (debounced - every 2 seconds)
    const now = Date.now();
    if (now - lastPushRef.current > 2000) {
      history.push(v);
      lastPushRef.current = now;
    }
  };

  const handleUndo = useCallback(() => {
    const prev = history.undo();
    if (prev !== null) {
      updateContent(prev);
    }
  }, [history, updateContent]);

  const handleRedo = useCallback(() => {
    const next = history.redo();
    if (next !== null) {
      updateContent(next);
    }
  }, [history, updateContent]);

  const insertAtCursor = useCallback((text: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = local.substring(0, start) + text + local.substring(end);
    updateContent(newValue);
    triggerSave();
    
    // Set cursor position after inserted text
    focusCursorAt(start + text.length);
  }, [focusCursorAt, local, triggerSave, updateContent]);

  const insertWithWrap = useCallback((before: string, after: string = "") => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = local.substring(start, end);
    const replacement = before + selectedText + after;
    const newValue = local.substring(0, start) + replacement + local.substring(end);
    updateContent(newValue);
    triggerSave();
    
    // Set cursor position
    const newCursorPos = selectedText ? start + replacement.length : start + before.length;
    focusCursorAt(newCursorPos);
  }, [focusCursorAt, local, triggerSave, updateContent]);

  const uploadFile = useCallback(async (file: File) => {
    if (!pageId) {
      toast.error("Cannot upload: no pageId");
      return;
    }
    const validationError = validateAttachmentFile(file);
    if (validationError) {
      toast.error("Upload failed", { description: validationError });
      return;
    }
    if (uploadInFlightRef.current) {
      toast.info("An upload is already in progress");
      return;
    }

    uploadInFlightRef.current = true;
    setUploading(true);
    try {
      const supabasePromise = import("@/lib/auth/supabase-browser").then(({ createClient }) =>
        createClient()
      );
      // Get upload path from API
      const pathRes = await api.post<{ data: { path: string } }>(
        `/api/pages/${pageId}/attachments/upload-path`,
        {
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
        }
      );
      const path = pathRes.data.path;

      // Upload directly to Supabase Storage
      const supabase = await supabasePromise;
      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) throw new Error(uploadError.message);

      // Register attachment
      await api.post(`/api/pages/${pageId}/attachments/register`, {
        path,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      });

      // The bucket stays private. Store an access-checked public proxy URL,
      // while using a temporary signed URL for the draft preview.
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("attachments")
        .createSignedUrl(path, 3600);
      const attachmentUrl = publicAttachmentUrl(path);
      if (signedUrlData?.signedUrl && !signedUrlError) {
        setPreviewUrls((current) => ({ ...current, [attachmentUrl]: signedUrlData.signedUrl }));
      } else {
        console.warn("Attachment uploaded but its temporary preview URL is unavailable", signedUrlError);
      }

      // Insert markdown
      if (file.type.startsWith("image/")) {
        insertAtCursor(`\n![${file.name}](${attachmentUrl})\n`);
      } else {
        insertAtCursor(`\n[${file.name}](${attachmentUrl})\n`);
      }
      
      toast.success("File uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      uploadInFlightRef.current = false;
      setUploading(false);
    }
  }, [pageId, insertAtCursor]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          uploadFile(file);
        }
        break;
      }
    }
  }, [uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file) {
      uploadFile(file);
    }
  }, [uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case "b":
          e.preventDefault();
          insertWithWrap("**", "**");
          break;
        case "i":
          e.preventDefault();
          insertWithWrap("_", "_");
          break;
        case "e":
          e.preventDefault();
          insertWithWrap("`", "`");
          break;
        case "l":
          e.preventDefault();
          insertWithWrap("[", "](url)");
          break;
        case "z":
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          break;
      }
    }
  }, [insertWithWrap, handleUndo, handleRedo]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/30">
        <MarkdownToolbar onInsert={insertWithWrap} />
        <div className="flex items-center gap-1 px-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!history.canUndo()}
            className="p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo (⌘Z)"
            aria-label="Undo"
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!history.canRedo()}
            className="p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo (⌘⇧Z)"
            aria-label="Redo"
          >
            <Redo2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div 
        className="relative grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[400px] p-4"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {dragOver && (
          <div className="absolute inset-0 z-10 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
            <p className="text-lg font-medium text-primary">Drop file to upload</p>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 z-10 bg-background/80 flex items-center justify-center">
            <p className="text-sm font-medium">Uploading…</p>
          </div>
        )}
        <textarea
          id="markdown-editor"
          ref={textareaRef}
          value={local}
          onChange={handleChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          className="font-mono text-sm p-4 border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          placeholder="Write markdown… (Paste images directly or drag & drop)"
          aria-label="Markdown editor"
          spellCheck={false}
        />
        <div className="p-4 border rounded-lg overflow-auto prose-kb text-sm max-w-none">
          <MarkdownPreview content={deferredLocal} previewUrls={previewUrls} />
        </div>
      </div>
    </div>
  );
}
