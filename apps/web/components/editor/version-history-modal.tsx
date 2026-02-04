"use client";

import { useState } from "react";
import { X, Clock, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { useVersionHistory } from "@/lib/api/hooks";
import { DiffViewer } from "./diff-viewer";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useLocale } from "@/lib/i18n/locale-provider";
import type { PageVersion } from "@/lib/api/types";

interface VersionHistoryModalProps {
  pageId: string;
  currentContent: string;
  onRestore: (content: string) => void;
  onClose: () => void;
}

export function VersionHistoryModal({
  pageId,
  currentContent,
  onRestore,
  onClose,
}: VersionHistoryModalProps) {
  const { t } = useLocale();
  const { data: versions, isLoading } = useVersionHistory(pageId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareWithCurrent, setCompareWithCurrent] = useState(true);

  const handleRestore = (version: PageVersion) => {
    const dateStr = new Date(version.created_at).toLocaleString();
    if (confirm(t("version.restoreConfirm", { date: dateStr }))) {
      onRestore(version.content_md || "");
      toast.success(t("version.restoredSuccess"), { description: t("version.restoredHint") });
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("version.justNow");
    if (diffMins < 60) return t("version.minutesAgo", { m: diffMins });
    if (diffHours < 24) return t("version.hoursAgo", { h: diffHours });
    if (diffDays < 7) return t("version.daysAgo", { d: diffDays });
    return d.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="bg-card border rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col overscroll-contain"
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-history-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 id="version-history-title" className="text-lg font-semibold">{t("version.title")}</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-muted rounded-md" aria-label={t("version.close")}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : !versions || versions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t("version.empty")}</p>
          ) : (
            <div className="space-y-3">
              {versions.map((version, idx) => {
                const isExpanded = expandedId === version.id;
                const isLatest = idx === 0;
                const prevVersion = idx < versions.length - 1 ? versions[idx + 1] : null;

                return (
                  <div key={version.id} className="border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : version.id)}
                        className="flex items-center gap-3 text-left flex-1"
                        aria-expanded={isExpanded}
                        aria-controls={`version-panel-${version.id}`}
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-medium">
                            {formatDate(version.created_at)}
                            {isLatest && (
                              <span className="ml-2 text-xs bg-primary/15 text-primary px-2 py-0.5 rounded">
                                {t("version.current")}
                              </span>
                            )}
                          </p>
                          {version.summary && (
                            <p className="text-xs text-muted-foreground">{version.summary}</p>
                          )}
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        {!isLatest && (
                          <button
                            type="button"
                            onClick={() => handleRestore(version)}
                            className="p-1.5 hover:bg-muted rounded text-xs flex items-center gap-1"
                            title={t("version.restoreTitle")}
                          >
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                            {t("version.restore")}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : version.id)}
                          className="p-1.5 hover:bg-muted rounded"
                          aria-label={isExpanded ? t("version.collapseDetails") : t("version.expandDetails")}
                          aria-expanded={isExpanded}
                          aria-controls={`version-panel-${version.id}`}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div id={`version-panel-${version.id}`} className="px-4 pb-4">
                        <DiffViewer
                          oldText={compareWithCurrent ? currentContent : (prevVersion?.content_md || "")}
                          newText={version.content_md || ""}
                          title={compareWithCurrent ? t("version.vsCurrent") : t("version.vsPrevious")}
                        />
                        <div className="mt-2 flex items-center gap-2">
                          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              checked={compareWithCurrent}
                              onChange={(e) => setCompareWithCurrent(e.target.checked)}
                              className="rounded"
                            />
                            {t("version.compareWithCurrent")}
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
