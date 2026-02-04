"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface CopyLinkButtonProps {
  url?: string;
  className?: string;
}

export function CopyLinkButton({ url, className = "" }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const linkToCopy = url || window.location.href;
    try {
      await navigator.clipboard.writeText(linkToCopy);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border hover:bg-muted transition-colors ${className}`}
      title="Copy link to clipboard"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          Copy Link
        </>
      )}
    </button>
  );
}
