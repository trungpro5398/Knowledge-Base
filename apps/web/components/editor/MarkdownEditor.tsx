"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onDebouncedSave?: () => void;
  debounceMs?: number;
}

export function MarkdownEditor({
  value,
  onChange,
  onDebouncedSave,
  debounceMs = 2000,
}: MarkdownEditorProps) {
  const [local, setLocal] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLocal(value);
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
  };

  return (
    <div className="grid grid-cols-2 gap-4 min-h-[400px]">
      <textarea
        value={local}
        onChange={handleChange}
        className="font-mono text-sm p-4 border rounded bg-background resize-none"
        placeholder="Write markdown..."
        spellCheck={false}
      />
      <div className="p-4 border rounded overflow-auto prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{local}</ReactMarkdown>
      </div>
    </div>
  );
}
