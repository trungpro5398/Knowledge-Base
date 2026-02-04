"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Save,
    Send,
    Check,
    History,
    Star,
    Share2,
    MoreHorizontal,
    Link2,
    Trash2,
    ArrowUpRight
} from "lucide-react";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import { useLocale } from "@/lib/i18n/locale-provider";

type PageStatus = "draft" | "published" | "archived";

interface PageActionsToolbarProps {
    pageId: string;
    spaceId: string;
    spaceSlug: string;
    status: PageStatus;
    saving?: boolean;
    savedAt?: Date | null;
    onSave: () => void;
    onPublish: () => void;
    onShowHistory: () => void;
    publishing?: boolean;
}

const statusClassNames: Record<PageStatus, string> = {
    draft: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    published: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    archived: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
};

export function PageActionsToolbar({
    pageId,
    spaceId,
    spaceSlug,
    status,
    saving = false,
    savedAt,
    onSave,
    onPublish,
    onShowHistory,
    publishing = false,
}: PageActionsToolbarProps) {
    const { t } = useLocale();
    const [isStarred, setIsStarred] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const statusLabel = t(`page.status.${status}` as "page.status.draft" | "page.status.published" | "page.status.archived");
    const statusClassName = statusClassNames[status];
    const pageUrl = `/kb/${spaceSlug}/${pageId}`;

    return (
        <div className="sticky top-0 z-20 -mx-8 px-8 py-3 mb-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/50">
            <div className="flex flex-wrap items-center gap-3">
                {/* Status Badge */}
                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${statusClassName}`}>
                    {statusLabel}
                </span>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* Star Button */}
                    <button
                        type="button"
                        onClick={() => setIsStarred(!isStarred)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title={isStarred ? t("page.removeFromFavorites") : t("page.addToFavorites")}
                        aria-label={isStarred ? t("page.removeFromFavorites") : t("page.addToFavorites")}
                    >
                        <Star
                            className={`h-4 w-4 ${isStarred ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                            aria-hidden="true"
                        />
                    </button>

                    {/* Save Button */}
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted disabled:opacity-50 transition-colors"
                    >
                        {saving ? (
                            <Save className="h-4 w-4 animate-pulse" aria-hidden="true" />
                        ) : savedAt ? (
                            <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                        ) : (
                            <Save className="h-4 w-4" aria-hidden="true" />
                        )}
                        <span className="hidden sm:inline">
                            {saving ? t("page.saving") : savedAt ? t("page.saved") : t("page.save")}
                        </span>
                    </button>

                    {/* Publish Button */}
                    <button
                        type="button"
                        onClick={onPublish}
                        disabled={publishing || status === "published"}
                        className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                    >
                        <Send className="h-4 w-4" aria-hidden="true" />
                        <span className="hidden sm:inline">
                            {publishing ? t("page.publishing") : t("page.publish")}
                        </span>
                    </button>

                    {/* History Button */}
                    <button
                        type="button"
                        onClick={onShowHistory}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title={t("page.versionHistory")}
                        aria-label={t("page.versionHistory")}
                    >
                        <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </button>

                    {/* More Actions Dropdown */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                            aria-label={t("page.moreActions")}
                            aria-expanded={showDropdown}
                            aria-controls="page-actions-dropdown"
                            aria-haspopup="menu"
                        >
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        </button>

                        {showDropdown && (
                            <>
                                <button
                                    type="button"
                                    className="fixed inset-0 z-30"
                                    onClick={() => setShowDropdown(false)}
                                    aria-label={t("common.close")}
                                />
                                <div
                                    id="page-actions-dropdown"
                                    className="absolute right-0 top-full mt-1 z-40 min-w-[180px] rounded-lg border bg-card shadow-lg py-1 animate-fade-in"
                                >
                                    <CopyLinkButton className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left" />

                                    <Link
                                        href={pageUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                                        onClick={() => setShowDropdown(false)}
                                    >
                                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                                        {t("page.viewPublished")}
                                    </Link>

                                    <div className="border-t border-border my-1" />

                                    <button
                                        type="button"
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                        disabled={isDeleting}
                                        onClick={async () => {
                                            setShowDropdown(false);
                                            if (isDeleting) return;
                                            const confirmed = window.confirm(
                                                t("page.moveToTrashConfirm")
                                            );
                                            if (!confirmed) return;
                                            setIsDeleting(true);
                                            try {
                                                await api.delete(`/api/pages/${pageId}`);
                                                toast.success(t("page.movedToTrashSuccess"));
                                                router.push(`/admin/spaces/${spaceId}`);
                                                router.refresh();
                                            } catch (err) {
                                                console.error(err);
                                                toast.error(t("page.moveToTrashFailed"));
                                                setIsDeleting(false);
                                            }
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        {isDeleting ? t("page.moving") : t("page.moveToTrash")}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
