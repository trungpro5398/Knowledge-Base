"use client";

import { diffLines, type Change } from "diff";

interface DiffViewerProps {
  oldText: string;
  newText: string;
  title?: string;
}

export function DiffViewer({ oldText, newText, title }: DiffViewerProps) {
  const changes = diffLines(oldText || "", newText || "");

  return (
    <div className="rounded-lg border overflow-hidden">
      {title && (
        <div className="px-4 py-2 bg-muted border-b font-medium text-sm">
          {title}
        </div>
      )}
      <div className="font-mono text-xs overflow-auto max-h-[500px]">
        {changes.map((change: Change, idx: number) => {
          if (change.added) {
            return (
              <div key={idx} className="bg-green-500/10 text-green-700 dark:text-green-400 px-4 py-0.5">
                <span className="text-green-600 dark:text-green-500 mr-2">+</span>
                {change.value}
              </div>
            );
          }
          if (change.removed) {
            return (
              <div key={idx} className="bg-red-500/10 text-red-700 dark:text-red-400 px-4 py-0.5">
                <span className="text-red-600 dark:text-red-500 mr-2">-</span>
                {change.value}
              </div>
            );
          }
          return (
            <div key={idx} className="px-4 py-0.5 text-muted-foreground">
              <span className="mr-3"> </span>
              {change.value}
            </div>
          );
        })}
      </div>
    </div>
  );
}
