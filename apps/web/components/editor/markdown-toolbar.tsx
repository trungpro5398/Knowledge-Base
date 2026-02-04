"use client";

import {
  Bold,
  Italic,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";

interface MarkdownToolbarProps {
  onInsert: (before: string, after?: string) => void;
}

export function MarkdownToolbar({ onInsert }: MarkdownToolbarProps) {
  const buttons = [
    { icon: Bold, label: "Bold (⌘B)", action: () => onInsert("**", "**") },
    { icon: Italic, label: "Italic (⌘I)", action: () => onInsert("_", "_") },
    { icon: Code, label: "Code (⌘E)", action: () => onInsert("`", "`") },
    { icon: LinkIcon, label: "Link (⌘L)", action: () => onInsert("[", "](url)") },
    { icon: ImageIcon, label: "Image", action: () => onInsert("![alt](", ")") },
    { icon: Heading1, label: "H1", action: () => onInsert("# ", "") },
    { icon: Heading2, label: "H2", action: () => onInsert("## ", "") },
    { icon: Heading3, label: "H3", action: () => onInsert("### ", "") },
    { icon: List, label: "Bullet List", action: () => onInsert("- ", "") },
    { icon: ListOrdered, label: "Numbered List", action: () => onInsert("1. ", "") },
    { icon: Quote, label: "Quote", action: () => onInsert("> ", "") },
  ];

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
      {buttons.map((btn, idx) => (
        <button
          key={idx}
          type="button"
          onClick={btn.action}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          title={btn.label}
          aria-label={btn.label}
        >
          <btn.icon className="h-4 w-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
