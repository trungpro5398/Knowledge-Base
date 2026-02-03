"use client";

import Link from "next/link";
import { AlertCircle, BookOpen, ArrowRight } from "lucide-react";

// Slugs match seed: lowercase, spaces → hyphens, non-alphanumeric removed
const START_LINKS = [
  { label: "Overview", path: "overview" },
  { label: "ProSys Core Design & Operating Model", path: "prosys-core-design-operating-model" },
  { label: "Workflow & Status", path: "workflow-status" },
  { label: "Board Usage Guide", path: "board-usage-guide" },
  { label: "Task Rules", path: "task-rules" },
];

export function ReadThisFirst({ spaceSlug }: { spaceSlug: string }) {
  return (
    <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 mb-8">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/15 text-primary shrink-0">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
            <span>Bắt đầu với ProSys</span>
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Nếu bạn mới dùng hệ thống này, hãy đọc lần lượt các mục dưới đây (tổng khoảng 10 phút).
          </p>
          <ul className="space-y-2">
            {START_LINKS.map((item) => (
              <li key={item.path}>
                <Link
                  href={`/kb/${spaceSlug}/${item.path}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  {item.label}
                  <ArrowRight className="h-3.5 w-3.5 opacity-70" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
