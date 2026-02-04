"use client";

import { RestoreButton } from "./RestoreButton";
import { DeleteButton } from "./DeleteButton";
import { Trash2, FileText, Clock } from "lucide-react";
import type { TrashItem } from "@/lib/api/types";
import { useLocale } from "@/lib/i18n/locale-provider";

function formatPath(path: string) {
  return path.split(".").join(" / ");
}

interface TrashPageContentProps {
  items: TrashItem[];
}

export function TrashPageContent({ items }: TrashPageContentProps) {
  const { t } = useLocale();

  return (
    <div className="p-6 sm:p-8 max-w-4xl w-full mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-balance">{t("admin.trashTitle")}</h1>
          <p className="text-muted-foreground mt-1">{t("admin.trashSubtitle")}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          {items.length} {t("common.items")}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Trash2 className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="text-muted-foreground">{t("admin.trashEmpty")}</p>
        </div>
      ) : (
        <ul className="rounded-xl border bg-card/70 divide-y shadow-sm">
          {items.map((item) => (
            <li
              key={item.page_id}
              className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5 rounded-md border bg-muted/60 p-2">
                  <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold truncate">{item.title || t("common.untitled")}</div>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                      {t("common.trash")}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {formatPath(item.path)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums md:mr-2">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {new Date(item.deleted_at).toLocaleDateString(undefined, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>

              <div className="flex items-center gap-1">
                <RestoreButton pageId={item.page_id} />
                <DeleteButton pageId={item.page_id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
