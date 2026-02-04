"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGE_TEMPLATES, type PageTemplate } from "@/lib/kb/templates";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

interface CreatePageModalProps {
    isOpen: boolean;
    onClose: () => void;
    spaceId: string;
    parentId?: string;
}

export function CreatePageModal({
    isOpen,
    onClose,
    spaceId,
    parentId,
}: CreatePageModalProps) {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState<string>("blank");
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const titleRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleCreate = async () => {
        if (!title.trim()) {
            setError("Please enter a page title to continue.");
            titleRef.current?.focus();
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            const template = PAGE_TEMPLATES.find((t) => t.id === selectedTemplate);
            const content = template?.content || "";

            // Create the page
            const response = await api.post<{ data: { id: string } }>(`/api/spaces/${spaceId}/pages`, {
                title: title.trim(),
                parent_id: parentId || null,
            });

            const pageId = response.data.id;

            // If template has content, create initial version
            if (content) {
                await api.post(`/api/pages/${pageId}/versions`, {
                    content_md: content,
                    summary: `Created from ${template?.name} template`,
                });
            }

            toast.success("Đã tạo trang", { description: title.trim() });
            // Navigate to edit page
            router.push(`/admin/spaces/${spaceId}/pages/${pageId}/edit`);
            onClose();
        } catch (err: any) {
            const message = err?.message || "Failed to create page. Try again.";
            setError(message);
            toast.error("Tạo trang thất bại", { description: message });
            titleRef.current?.focus();
        } finally {
            setIsCreating(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            onClose();
        } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            handleCreate();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onKeyDown={handleKeyDown}
        >
            {/* Backdrop */}
            <button
                type="button"
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
                aria-label="Close dialog"
            />

            {/* Modal */}
            <div
                className="relative z-10 w-full max-w-lg mx-4 bg-card rounded-xl shadow-2xl animate-fade-in overflow-hidden overscroll-contain"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-page-title"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 id="create-page-title" className="text-lg font-semibold">Create New Page</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        aria-label="Close dialog"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Title Input */}
                    <div className="space-y-2">
                        <label htmlFor="create-page-title-input" className="text-sm font-medium">
                            Page Title
                        </label>
                        <input
                            id="create-page-title-input"
                            name="title"
                            ref={titleRef}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter page title…"
                            className="w-full"
                            autoComplete="off"
                            aria-invalid={!!error}
                            aria-describedby={error ? "create-page-error" : undefined}
                        />
                        {error && (
                          <p id="create-page-error" className="text-sm text-destructive" role="status" aria-live="polite">
                            {error}
                          </p>
                        )}
                    </div>

                    {/* Template Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium">
                            Choose a Template
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {PAGE_TEMPLATES.map((template) => (
                                <TemplateCard
                                    key={template.id}
                                    template={template}
                                    isSelected={selectedTemplate === template.id}
                                    onClick={() => setSelectedTemplate(template.id)}
                                />
                            ))}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/30">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                        disabled={isCreating}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleCreate}
                        disabled={isCreating || !title.trim()}
                        className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                    >
                        {isCreating ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                Creating…
                            </>
                        ) : (
                            <>
                                <FileText className="h-4 w-4" aria-hidden="true" />
                                Create Page
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function TemplateCard({
    template,
    isSelected,
    onClick,
}: {
    template: PageTemplate;
    isSelected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
        >
            <span className="text-2xl shrink-0">{template.icon}</span>
            <div className="min-w-0">
                <p className={cn(
                    "text-sm font-medium truncate",
                    isSelected && "text-primary"
                )}>
                    {template.name}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                    {template.description}
                </p>
            </div>
        </button>
    );
}
