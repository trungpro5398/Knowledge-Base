"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileText, Pencil, FolderOpen, Plus, GripVertical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useReorderPages } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

export interface TreeNode {
  id: string;
  title: string;
  slug: string;
  children?: TreeNode[];
}

export interface SidebarGroupConfig {
  id: string;
  label: string;
  icon: string;
  titles: readonly string[];
}

interface PageTreeProps {
  spaceId: string;
  spaceSlug: string;
  nodes: TreeNode[];
  showEditLink?: boolean;
  isLoading?: boolean;
  showCreateLink?: boolean;
  showCreateChild?: boolean;
  enableDragAndDrop?: boolean;
  /** When set (e.g. tet-prosys), sidebar renders as collapsible groups */
  groupConfig?: readonly SidebarGroupConfig[];
  /**
   * Determines where page links navigate to:
   * - "kb" (default): public KB routes (/kb/[spaceSlug]/...)
   * - "admin": admin editor routes (/admin/spaces/[spaceId]/pages/[pageId]/edit)
   */
  linkMode?: "kb" | "admin";
}

function TreeNodeItem({
  node,
  spaceId,
  spaceSlug,
  path,
  showEditLink,
  showCreateChild,
  linkMode,
  activePageId,
}: {
  node: TreeNode;
  spaceId: string;
  spaceSlug: string;
  path: string[];
  showEditLink: boolean;
  showCreateChild: boolean;
  linkMode: "kb" | "admin";
  activePageId?: string | null;
}) {
  const href =
    linkMode === "admin"
      ? `/admin/spaces/${spaceId}/${node.id}`
      : `/kb/${spaceSlug}/${path.join("/")}`;
  const editHref = `/admin/spaces/${spaceId}/pages/${node.id}/edit`;
  const isActive = linkMode === "admin" && activePageId === node.id;
  
  return (
    <li className="border-l border-border pl-4 py-2 first:pt-0">
      <div
        className={cn(
          "flex items-center gap-2 group",
          isActive && "bg-primary/10 rounded-md px-2 py-1 -ml-2"
        )}
      >
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <Link
          href={href}
          className={cn(
            "text-sm font-medium transition-colors flex-1 truncate",
            isActive ? "text-primary font-semibold" : "hover:text-primary"
          )}
          aria-current={isActive ? "page" : undefined}
          prefetch={true}
        >
          {node.title}
        </Link>
        {showCreateChild && linkMode === "admin" && (
          <Link
            href={`/admin/spaces/${spaceId}/pages/new?parentId=${node.id}`}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0"
            title="Tạo trang con"
            aria-label="Tạo trang con"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
        {/* Chỉ hiện nút edit riêng khi đang ở chế độ KB (public) và có quyền edit */}
        {showEditLink && linkMode === "kb" && (
          <Link
            href={editHref}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0"
            title="Chỉnh sửa"
            aria-label="Chỉnh sửa"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
      {(node.children?.length ?? 0) > 0 && (
        <ul className="mt-2 ml-2 space-y-1">
          {(node.children ?? []).map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              spaceId={spaceId}
              spaceSlug={spaceSlug}
              path={[...path, child.slug]}
              showEditLink={showEditLink}
              showCreateChild={showCreateChild}
              linkMode={linkMode}
              activePageId={activePageId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function getGroupId(title: string, config: readonly SidebarGroupConfig[]): string | null {
  for (const g of config) {
    if (g.titles.includes(title)) return g.id;
  }
  return null;
}

const INDENTATION_WIDTH = 24;

interface FlattenedItem extends TreeNode {
  depth: number;
  parentId: string | null;
}

function flattenTree(nodes: TreeNode[], parentId: string | null = null, depth = 0): FlattenedItem[] {
  const items: FlattenedItem[] = [];
  for (const node of nodes) {
    items.push({ ...node, depth, parentId });
    if (node.children && node.children.length > 0) {
      items.push(...flattenTree(node.children, node.id, depth + 1));
    }
  }
  return items;
}

function buildTree(items: FlattenedItem[]): TreeNode[] {
  const nodesById = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const item of items) {
    nodesById.set(item.id, { id: item.id, title: item.title, slug: item.slug, children: [] });
  }

  for (const item of items) {
    const node = nodesById.get(item.id)!;
    if (item.parentId) {
      const parent = nodesById.get(item.parentId);
      if (parent) {
        parent.children!.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function getDescendantIds(items: FlattenedItem[], id: string): string[] {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return [];
  const result: string[] = [];
  const depth = items[index]!.depth;
  for (let i = index + 1; i < items.length; i += 1) {
    if (items[i]!.depth <= depth) break;
    result.push(items[i]!.id);
  }
  return result;
}

function removeChildrenOf(items: FlattenedItem[], id: string | null): FlattenedItem[] {
  if (!id) return items;
  const descendantIds = new Set(getDescendantIds(items, id));
  return items.filter((item) => !descendantIds.has(item.id));
}

function getParentId(items: FlattenedItem[], index: number, depth: number): string | null {
  if (depth === 0) return null;
  for (let i = index - 1; i >= 0; i -= 1) {
    const item = items[i]!;
    if (item.depth === depth - 1) return item.id;
  }
  return null;
}

function getProjection(
  items: FlattenedItem[],
  activeId: string,
  overId: string,
  offsetLeft: number,
  indentationWidth: number
) {
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const overIndex = items.findIndex((item) => item.id === overId);
  const activeItem = items[activeIndex];
  if (!activeItem || overIndex === -1) return null;

  const reordered = [...items];
  reordered.splice(activeIndex, 1);
  reordered.splice(overIndex, 0, activeItem);

  const previousItem = reordered[overIndex - 1];
  const nextItem = reordered[overIndex + 1];
  const dragDepth = Math.round(offsetLeft / indentationWidth);
  const projectedDepth = activeItem.depth + dragDepth;
  const maxDepth = previousItem ? previousItem.depth + 1 : 0;
  const minDepth = nextItem ? nextItem.depth : 0;
  const depth = Math.max(Math.min(projectedDepth, maxDepth), minDepth);
  const parentId = getParentId(reordered, overIndex, depth);

  return { depth, parentId };
}

function getLastDescendantIndex(items: FlattenedItem[], id: string): number {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return -1;
  const depth = items[index]!.depth;
  let lastIndex = index;
  for (let i = index + 1; i < items.length; i += 1) {
    if (items[i]!.depth <= depth) break;
    lastIndex = i;
  }
  return lastIndex;
}

function getProjectedMove(
  items: FlattenedItem[],
  activeId: string,
  overId: string,
  offsetLeft: number,
  indentationWidth: number,
  overPosition: "above" | "center" | "below"
) {
  const base = getProjection(items, activeId, overId, offsetLeft, indentationWidth);
  if (!base) return null;

  const activeItem = items.find((item) => item.id === activeId);
  const overItem = items.find((item) => item.id === overId);
  if (!activeItem || !overItem) return base;

  const dragDepth = Math.round(offsetLeft / indentationWidth);
  const desiredDepth = activeItem.depth + dragDepth;

  const childIntent = offsetLeft >= indentationWidth * 0.8 && overPosition === "center";
  if (childIntent && desiredDepth > overItem.depth) {
    return { depth: overItem.depth + 1, parentId: overItem.id, insertAfterId: overItem.id };
  }

  return base;
}

function moveSubtree(
  items: FlattenedItem[],
  activeId: string,
  overId: string,
  projected: { depth: number; parentId: string | null; insertAfterId?: string }
) {
  const activeIndex = items.findIndex((item) => item.id === activeId);
  if (activeIndex === -1) return items;

  const descendantIds = getDescendantIds(items, activeId);
  const subtreeIds = new Set([activeId, ...descendantIds]);
  const subtree = items.filter((item) => subtreeIds.has(item.id));
  const remaining = items.filter((item) => !subtreeIds.has(item.id));
  const overIndex = remaining.findIndex((item) => item.id === overId);
  let insertIndex = overIndex === -1 ? remaining.length : overIndex;
  if (projected.insertAfterId && projected.insertAfterId === overId) {
    const lastIndex = getLastDescendantIndex(remaining, overId);
    if (lastIndex !== -1) {
      insertIndex = lastIndex + 1;
    } else if (overIndex !== -1) {
      insertIndex = overIndex + 1;
    }
  }

  const nextItems = [
    ...remaining.slice(0, insertIndex),
    ...subtree,
    ...remaining.slice(insertIndex),
  ];

  const activeItem = items[activeIndex]!;
  const depthDelta = projected.depth - activeItem.depth;
  return nextItems.map((item) => {
    if (item.id === activeId) {
      return { ...item, depth: projected.depth, parentId: projected.parentId };
    }
    if (subtreeIds.has(item.id)) {
      return { ...item, depth: item.depth + depthDelta };
    }
    return item;
  });
}

function SortableTreeItem({
  item,
  depth,
  spaceId,
  isActive,
  showCreateChild,
}: {
  item: FlattenedItem;
  depth: number;
  spaceId: string;
  isActive: boolean;
  showCreateChild: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: depth * INDENTATION_WIDTH,
  };

  return (
    <li ref={setNodeRef} style={style} className={cn(isDragging && "opacity-60")}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 group",
          isActive && "bg-primary/10 text-primary"
        )}
      >
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          title="Kéo để sắp xếp"
          aria-label="Kéo để sắp xếp"
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <Link
          href={`/admin/spaces/${spaceId}/${item.id}`}
          className={cn(
            "text-sm font-medium transition-colors flex-1 truncate",
            isActive ? "text-primary font-semibold" : "hover:text-primary"
          )}
          aria-current={isActive ? "page" : undefined}
          prefetch={true}
        >
          {item.title}
        </Link>
        {showCreateChild && (
          <Link
            href={`/admin/spaces/${spaceId}/pages/new?parentId=${item.id}`}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0"
            title="Tạo trang con"
            aria-label="Tạo trang con"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
    </li>
  );
}

function DraggablePageTree({
  spaceId,
  nodes,
  createLink,
  activePageId,
  showCreateChild,
}: {
  spaceId: string;
  nodes: TreeNode[];
  createLink: ReactNode;
  activePageId: string | null;
  showCreateChild: boolean;
}) {
  const reorderPages = useReorderPages(spaceId);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>(nodes);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);
  const [overPosition, setOverPosition] = useState<"above" | "center" | "below">("center");

  useEffect(() => {
    setTreeNodes(nodes);
  }, [nodes]);

  const flattenedItems = useMemo(() => flattenTree(treeNodes), [treeNodes]);
  const visibleItems = useMemo(
    () => removeChildrenOf(flattenedItems, activeId),
    [flattenedItems, activeId]
  );
  const projected =
    activeId && overId
      ? getProjectedMove(visibleItems, activeId, overId, offsetLeft, INDENTATION_WIDTH, overPosition)
      : null;
  const itemsToRender = useMemo(
    () =>
      visibleItems.map((item) =>
        item.id === activeId && projected ? { ...item, depth: projected.depth } : item
      ),
    [visibleItems, activeId, projected]
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const activeItem = flattenedItems.find((item) => item.id === activeId) ?? null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setOverId(String(event.active.id));
    setOffsetLeft(0);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    setOffsetLeft(event.delta.x);
    const activeRect = event.active.rect.current.translated ?? event.active.rect.current.initial;
    const overRect = event.over?.rect;
    if (activeRect && overRect) {
      const activeCenterY = activeRect.top + activeRect.height / 2;
      const overTop = overRect.top;
      const overBottom = overRect.top + overRect.height;
      const overHeight = overRect.height || 1;
      const topZone = overTop + overHeight * 0.35;
      const bottomZone = overBottom - overHeight * 0.35;
      if (activeCenterY < topZone) {
        setOverPosition("above");
      } else if (activeCenterY > bottomZone) {
        setOverPosition("below");
      } else {
        setOverPosition("center");
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over ? String(event.over.id) : null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      setOverId(null);
      setOffsetLeft(0);
      return;
    }

    const activeKey = String(active.id);
    const overKey = String(over.id);
    if (activeKey === overKey) {
      setActiveId(null);
      setOverId(null);
      setOffsetLeft(0);
      return;
    }

    const currentItems = flattenTree(treeNodes);
    const projectedMove = getProjectedMove(
      removeChildrenOf(currentItems, activeKey),
      activeKey,
      overKey,
      offsetLeft,
      INDENTATION_WIDTH,
      overPosition
    );

    if (!projectedMove) {
      setActiveId(null);
      setOverId(null);
      setOffsetLeft(0);
      return;
    }

    const descendants = new Set(getDescendantIds(currentItems, activeKey));
    if (projectedMove.parentId && descendants.has(projectedMove.parentId)) {
      setActiveId(null);
      setOverId(null);
      setOffsetLeft(0);
      return;
    }

    const nextItems = moveSubtree(currentItems, activeKey, overKey, projectedMove);
    const previousTree = treeNodes;
    setTreeNodes(buildTree(nextItems));

    const orderMap = new Map<string | null, number>();
    const updates = nextItems.map((item) => {
      const parentId = item.parentId ?? null;
      const order = orderMap.get(parentId) ?? 0;
      orderMap.set(parentId, order + 1);
      return { id: item.id, sort_order: order, parent_id: parentId };
    });

    try {
      await reorderPages.mutateAsync(updates);
    } catch {
      setTreeNodes(previousTree);
    } finally {
      setActiveId(null);
      setOverId(null);
      setOffsetLeft(0);
    }
  };

  return (
    <div>
      {createLink}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setOverId(null);
          setOffsetLeft(0);
        }}
      >
        <SortableContext
          items={itemsToRender.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-1">
            {itemsToRender.map((item) => (
              <SortableTreeItem
                key={item.id}
                item={item}
                depth={item.depth}
                spaceId={spaceId}
                isActive={activePageId === item.id}
                showCreateChild={showCreateChild}
              />
            ))}
          </ul>
        </SortableContext>

        <DragOverlay>
          {activeItem ? (
            <div className="rounded-md border bg-card shadow-lg px-3 py-2 text-sm font-medium">
              {activeItem.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

export function PageTree({
  spaceId,
  spaceSlug,
  nodes,
  showEditLink = true,
  isLoading = false,
  showCreateLink = false,
  showCreateChild = false,
  enableDragAndDrop = false,
  groupConfig,
  linkMode = "kb",
}: PageTreeProps) {
  const pathname = usePathname();
  // Extract active pageId from URL if in admin mode
  const activePageId =
    linkMode === "admin" && pathname
      ? pathname.match(/\/admin\/spaces\/[^/]+\/([^/]+)$/)?.[1] ?? null
      : null;
  const canDrag = enableDragAndDrop && linkMode === "admin" && !(groupConfig && groupConfig.length > 0);
  const effectiveNodes = nodes;

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-6 w-3/4 ml-4" />
        <Skeleton className="h-6 w-2/3 ml-8" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-6 w-4/5 ml-4" />
      </div>
    );
  }

  if (effectiveNodes.length === 0) {
    return (
      <div className="py-8 text-center">
        <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
        <p className="text-sm text-muted-foreground mb-2">Chưa có trang nào.</p>
        <p className="text-xs text-muted-foreground">Tạo trang mới trong Admin để bắt đầu.</p>
        {showCreateLink && linkMode === "admin" && (
          <div className="mt-4">
            <Link
              href={`/admin/spaces/${spaceId}/pages/new`}
              className="btn-primary h-8 px-3 text-xs gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Tạo trang
            </Link>
          </div>
        )}
      </div>
    );
  }

  const createLink =
    showCreateLink && linkMode === "admin" ? (
      <div className="mb-3">
        <Link
          href={`/admin/spaces/${spaceId}/pages/new`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
          Tạo trang mới
        </Link>
      </div>
    ) : null;

  if (canDrag) {
    return (
      <DraggablePageTree
        spaceId={spaceId}
        nodes={effectiveNodes}
        createLink={createLink}
        activePageId={activePageId}
        showCreateChild={showCreateChild}
      />
    );
  }

  if (groupConfig && groupConfig.length > 0) {
    const byGroup = new Map<string | "other", TreeNode[]>();
    for (const node of effectiveNodes) {
      const gid = getGroupId(node.title, groupConfig);
      const key = gid ?? "other";
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(node);
    }
    return (
      <div className="space-y-1">
        {createLink}
        {groupConfig.map((g) => {
          const groupNodes = byGroup.get(g.id) ?? [];
          if (groupNodes.length === 0) return null;
          return (
            <details
              key={g.id}
              className="group/details rounded-lg border border-border/80 overflow-hidden"
              open={g.id === "getting-started"}
            >
              <summary className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground cursor-pointer list-none hover:bg-muted/50 hover:text-foreground [&::-webkit-details-marker]:hidden">
                <span className="group-open/details:rotate-90 transition-transform">{g.icon}</span>
                <span>{g.label}</span>
              </summary>
              <ul className="border-t border-border/80 py-2 space-y-0">
                {groupNodes.map((node) => (
                  <TreeNodeItem
                    key={node.id}
                    node={node}
                    spaceId={spaceId}
                    spaceSlug={spaceSlug}
                    path={[node.slug]}
                    showEditLink={showEditLink}
                    showCreateChild={showCreateChild}
                    linkMode={linkMode}
                    activePageId={activePageId}
                  />
                ))}
              </ul>
            </details>
          );
        })}
        {(byGroup.get("other")?.length ?? 0) > 0 && (
          <details className="group/details rounded-lg border border-border/80 overflow-hidden">
            <summary className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground cursor-pointer list-none hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
              Khác
            </summary>
            <ul className="border-t border-border/80 py-2 space-y-0">
              {byGroup.get("other")!.map((node) => (
                <TreeNodeItem
                  key={node.id}
                  node={node}
                  spaceId={spaceId}
                  spaceSlug={spaceSlug}
                  path={[node.slug]}
                  showEditLink={showEditLink}
                  showCreateChild={showCreateChild}
                  linkMode={linkMode}
                  activePageId={activePageId}
                />
              ))}
            </ul>
          </details>
        )}
      </div>
    );
  }

  return (
    <div>
      {createLink}
      <ul className="space-y-1">
        {effectiveNodes.map((node) => (
          <TreeNodeItem
            key={node.id}
            node={node}
            spaceId={spaceId}
            spaceSlug={spaceSlug}
            path={[node.slug]}
            showEditLink={showEditLink}
            showCreateChild={showCreateChild}
            linkMode={linkMode}
            activePageId={activePageId}
          />
        ))}
      </ul>
    </div>
  );
}
