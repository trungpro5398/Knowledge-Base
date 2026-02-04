"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/lib/i18n/locale-provider";

interface CopyLinkButtonProps {
  url?: string;
  className?: string;
}

export function CopyLinkButton({ url, className = "" }: CopyLinkButtonProps) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const linkToCopy = url || window.location.href;
    try {
      await navigator.clipboard.writeText(linkToCopy);
      setCopied(true);
      toast.success(t("copy.success"));
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(t("copy.failed"));
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border hover:bg-muted transition-colors ${className}`}
      title={t("copy.title")}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
          {t("copy.copied")}
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          {t("copy.button")}
        </>
      )}
    </button>
  );
}
