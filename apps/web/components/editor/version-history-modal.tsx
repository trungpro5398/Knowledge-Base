"use client";

import { useState } from "react";
import { X, Clock, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { useVersionHistory } from "@/lib/api/hooks";
import { DiffViewer } from "./diff-viewer";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
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
  const { data: versions, isLoading } = useVersionHistory(pageId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareWithCurrent, setCompareWithCurrent] = useState(true);

  const handleRestore = (version: PageVersion) => {
    if (confirm(`Restore to version from ${new Date(version.created_at).toLocaleString()}?`)) {
      onRestore(version.content_md || "");
      toast.success("Version restored", { description: "Don't forget to save!" });
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Version History</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-md">
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
            <p className="text-center text-muted-foreground py-8">No version history available</p>
          ) : (
            <div className="space-y-3">
              {versions.map((version, idx) => {
                const isExpanded = expandedId === version.id;
                const isLatest = idx === 0;
                const prevVersion = idx < versions.length - 1 ? versions[idx + 1] : null;

                return (
                  <div
                    key={version.id}
                    className="border rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : version.id)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {formatDate(version.created_at)}
                            {isLatest && (
                              <span className="ml-2 text-xs bg-primary/15 text-primary px-2 py-0.5 rounded">
                                Current
                              </span>
                            )}
                          </p>
                          {version.summary && (
                            <p className="text-xs text-muted-foreground">{version.summary}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isLatest && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(version);
                            }}
                            className="p-1.5 hover:bg-muted rounded text-xs flex items-center gap-1"
                            title="Restore this version"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restore
                          </button>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <DiffViewer
                          oldText={compareWithCurrent ? currentContent : (prevVersion?.content_md || "")}
                          newText={version.content_md || ""}
                          title={compareWithCurrent ? "vs Current" : "vs Previous"}
                        />
                        <div className="mt-2 flex items-center gap-2">
                          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              checked={compareWithCurrent}
                              onChange={(e) => setCompareWithCurrent(e.target.checked)}
                              className="rounded"
                            />
                            Compare with current version
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
