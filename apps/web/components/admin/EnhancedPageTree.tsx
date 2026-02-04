"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { FileText, ChevronRight, Pencil, FolderOpen, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TreeNode {
    id: string;
    title: string;
    slug: string;
    children?: TreeNode[];
}

interface EnhancedPageTreeProps {
    spaceId: string;
    spaceSlug: string;
    nodes: TreeNode[];
    showEditLink?: boolean;
    activePath?: string;
    onCreatePage?: (parentId?: string) => void;
}

interface TreeNodeItemProps {
    node: TreeNode;
    spaceId: string;
    spaceSlug: string;
    path: string[];
    depth: number;
    showEditLink: boolean;
    activePath?: string;
    isLast: boolean;
    onCreatePage?: (parentId?: string) => void;
}

function TreeNodeItem({
    node,
    spaceId,
    spaceSlug,
    path,
    depth,
    showEditLink,
    activePath,
    isLast,
    onCreatePage,
}: TreeNodeItemProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = (node.children?.length ?? 0) > 0;
    const href = `/kb/${spaceSlug}/${path.join("/")}`;
    const editHref = `/admin/spaces/${spaceId}/pages/${node.id}/edit`;
    const isActive = activePath === node.id;

    return (
        <li className="relative">
            {/* Vertical tree line */}
            {depth > 0 && (
                <div
                    className={cn(
                        "absolute top-0 w-px bg-border",
                        isLast ? "h-[20px]" : "h-full"
                    )}
                    style={{ left: `${(depth - 1) * 20 + 10}px` }}
                />
            )}

            {/* Horizontal connector */}
            {depth > 0 && (
                <div
                    className="absolute top-[20px] h-px bg-border"
                    style={{
                        left: `${(depth - 1) * 20 + 10}px`,
                        width: "10px"
                    }}
                />
            )}

            <div
                className={cn(
                    "tree-node-content flex items-center gap-1 py-1.5 px-2 rounded-md group transition-colors",
                    isActive && "tree-node-active bg-[hsl(var(--sidebar-active-bg))]",
                    !isActive && "hover:bg-muted/50"
                )}
                style={{ marginLeft: `${depth * 20}px` }}
            >
                {/* Expand/Collapse button */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={cn(
                        "p-1 rounded hover:bg-muted transition-colors shrink-0",
                        !hasChildren && "invisible"
                    )}
                    aria-label={isExpanded ? "Collapse section" : "Expand section"}
                >
                    <ChevronRight
                        className={cn(
                            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                            isExpanded && "rotate-90"
                        )}
                        aria-hidden="true"
                    />
                </button>

                {/* Icon */}
                {hasChildren ? (
                    <FolderOpen className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground"
                    )} />
                ) : (
                    <FileText className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground"
                    )} />
                )}

                {/* Title Link */}
                <Link
                    href={href}
                    className={cn(
                        "flex-1 truncate text-sm transition-colors",
                        isActive ? "text-primary font-medium" : "hover:text-primary"
                    )}
                    title={node.title}
                >
                    {node.title}
                </Link>

                {/* Quick Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {showEditLink && (
                        <Link
                            href={editHref}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit page"
                            aria-label="Edit page"
                        >
                            <Pencil className="h-3 w-3" />
                        </Link>
                    )}
                    {onCreatePage && (
                        <button
                            onClick={() => onCreatePage(node.id)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Add child page"
                            aria-label="Add child page"
                        >
                            <Plus className="h-3 w-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Children */}
            {hasChildren && (
                <ul
                    className={cn(
                        "overflow-hidden transition-[max-height,opacity] duration-200",
                        isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                    )}
                >
                    {node.children!.map((child, index) => (
                        <TreeNodeItem
                            key={child.id}
                            node={child}
                            spaceId={spaceId}
                            spaceSlug={spaceSlug}
                            path={[...path, child.slug]}
                            depth={depth + 1}
                            showEditLink={showEditLink}
                            activePath={activePath}
                            isLast={index === node.children!.length - 1}
                            onCreatePage={onCreatePage}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}

export function EnhancedPageTree({
    spaceId,
    spaceSlug,
    nodes,
    showEditLink = true,
    activePath,
    onCreatePage,
}: EnhancedPageTreeProps) {
    if (nodes.length === 0) {
        return (
            <div className="py-12 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground mb-2">No pages yet</p>
                <p className="text-sm text-muted-foreground/70">
                    Create your first page to get started
                </p>
            </div>
        );
    }

    return (
        <ul className="space-y-0.5">
            {nodes.map((node, index) => (
                <TreeNodeItem
                    key={node.id}
                    node={node}
                    spaceId={spaceId}
                    spaceSlug={spaceSlug}
                    path={[node.slug]}
                    depth={0}
                    showEditLink={showEditLink}
                    activePath={activePath}
                    isLast={index === nodes.length - 1}
                    onCreatePage={onCreatePage}
                />
            ))}
        </ul>
    );
}
