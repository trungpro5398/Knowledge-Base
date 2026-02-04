"use client";

import { useState, useCallback } from "react";
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
} from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileText, GripVertical, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DraggableNode {
    id: string;
    title: string;
    slug: string;
    children?: DraggableNode[];
    parent_id?: string | null;
}

interface DraggablePageTreeProps {
    nodes: DraggableNode[];
    spaceId: string;
    onReorder: (pageId: string, newParentId: string | null, newIndex: number) => Promise<void>;
}

interface SortableItemProps {
    node: DraggableNode;
    depth: number;
}

function SortableItem({ node, depth }: SortableItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: node.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const hasChildren = (node.children?.length ?? 0) > 0;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group relative",
                isDragging && "opacity-50"
            )}
        >
            <div
                className={cn(
                    "flex items-center gap-2 py-2 px-3 rounded-lg transition-colors",
                    "hover:bg-muted/50",
                    isDragging && "bg-primary/10 ring-2 ring-primary/30"
                )}
                style={{ marginLeft: `${depth * 24}px` }}
            >
                {/* Drag Handle */}
                <button
                    {...attributes}
                    {...listeners}
                    className="p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                    aria-label="Drag to reorder"
                >
                    <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </button>

                {/* Icon */}
                {hasChildren ? (
                    <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                ) : (
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                )}

                {/* Title */}
                <span className="text-sm truncate flex-1">{node.title}</span>
            </div>

            {/* Children */}
            {hasChildren && (
                <div className="mt-0.5">
                    {node.children!.map((child) => (
                        <SortableItem
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function DragOverlayItem({ node }: { node: DraggableNode }) {
    return (
        <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-card shadow-lg border">
            <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium">{node.title}</span>
        </div>
    );
}

export function DraggablePageTree({
    nodes,
    spaceId,
    onReorder,
}: DraggablePageTreeProps) {
    const [activeNode, setActiveNode] = useState<DraggableNode | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const findNode = useCallback((id: string, items: DraggableNode[]): DraggableNode | null => {
        for (const item of items) {
            if (item.id === id) return item;
            if (item.children) {
                const found = findNode(id, item.children);
                if (found) return found;
            }
        }
        return null;
    }, []);

    const handleDragStart = (event: DragStartEvent) => {
        const node = findNode(event.active.id as string, nodes);
        setActiveNode(node);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveNode(null);

        if (!over || active.id === over.id) return;

        // Find indices and handle reorder
        const activeId = active.id as string;
        const overId = over.id as string;

        // For now, simple flat reorder - can be extended for nesting
        const flatNodes = flattenNodes(nodes);
        const oldIndex = flatNodes.findIndex((n) => n.id === activeId);
        const newIndex = flatNodes.findIndex((n) => n.id === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
            await onReorder(activeId, null, newIndex);
        }
    };

    const flattenNodes = (items: DraggableNode[]): DraggableNode[] => {
        return items.reduce((acc, item) => {
            acc.push(item);
            if (item.children) {
                acc.push(...flattenNodes(item.children));
            }
            return acc;
        }, [] as DraggableNode[]);
    };

    const allIds = flattenNodes(nodes).map((n) => n.id);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-0.5">
                    {nodes.map((node) => (
                        <SortableItem key={node.id} node={node} depth={0} />
                    ))}
                </div>
            </SortableContext>

            <DragOverlay>
                {activeNode && <DragOverlayItem node={activeNode} />}
            </DragOverlay>
        </DndContext>
    );
}
