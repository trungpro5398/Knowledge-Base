"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Undo2, Redo2 } from "lucide-react";
import { createClient } from "@/lib/auth/supabase-browser";
import { api } from "@/lib/api/client";
import { MarkdownToolbar } from "./markdown-toolbar";
import { HistoryStack } from "@/lib/editor/history-stack";

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
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef(new HistoryStack(50));
  const lastPushRef = useRef<number>(0);

  useEffect(() => {
    setLocal(value);
    historyRef.current.initialize(value);
  }, [value]);

  const triggerSave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onDebouncedSave?.();
    }, debounceMs);
  }, [onDebouncedSave, debounceMs]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setLocal(v);
    onChange(v);
    triggerSave();

    // Push to history stack (debounced - every 2 seconds)
    const now = Date.now();
    if (now - lastPushRef.current > 2000) {
      historyRef.current.push(v);
      lastPushRef.current = now;
    }
  };

  const handleUndo = useCallback(() => {
    const prev = historyRef.current.undo();
    if (prev !== null) {
      setLocal(prev);
      onChange(prev);
    }
  }, [onChange]);

  const handleRedo = useCallback(() => {
    const next = historyRef.current.redo();
    if (next !== null) {
      setLocal(next);
      onChange(next);
    }
  }, [onChange]);

  const insertAtCursor = useCallback((text: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = local.substring(0, start) + text + local.substring(end);
    setLocal(newValue);
    onChange(newValue);
    triggerSave();
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  }, [local, onChange, triggerSave]);

  const insertWithWrap = useCallback((before: string, after: string = "") => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = local.substring(start, end);
    const replacement = before + selectedText + after;
    const newValue = local.substring(0, start) + replacement + local.substring(end);
    setLocal(newValue);
    onChange(newValue);
    triggerSave();
    
    // Set cursor position
    const newCursorPos = selectedText ? start + replacement.length : start + before.length;
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [local, onChange, triggerSave]);

  const uploadFile = useCallback(async (file: File) => {
    if (!pageId) {
      toast.error("Cannot upload: no pageId");
      return;
    }
    
    setUploading(true);
    try {
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
      const supabase = createClient();
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

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("attachments")
        .getPublicUrl(path);

      // Insert markdown
      if (file.type.startsWith("image/")) {
        insertAtCursor(`\n![${file.name}](${publicUrl})\n`);
      } else {
        insertAtCursor(`\n[${file.name}](${publicUrl})\n`);
      }
      
      toast.success("File uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setUploading(false);
    }
  }, [pageId, insertAtCursor]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
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
            disabled={!historyRef.current.canUndo()}
            className="p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo (⌘Z)"
            aria-label="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!historyRef.current.canRedo()}
            className="p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo (⌘⇧Z)"
            aria-label="Redo"
          >
            <Redo2 className="h-4 w-4" />
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
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{local}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
