"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileText, GripVertical, Pencil } from "lucide-react";
import { useReorderPages } from "@/lib/api/hooks";

interface TreeNode {
  id: string;
  title: string;
  slug: string;
  sort_order?: number;
  children?: TreeNode[];
}

interface SortableItemProps {
  node: TreeNode;
  spaceId: string;
  spaceSlug: string;
  path: string[];
}

function SortableItem({ node, spaceId, spaceSlug, path }: SortableItemProps) {
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
    opacity: isDragging ? 0.5 : 1,
  };

  const href = `/kb/${spaceSlug}/${path.join("/")}`;
  const editHref = `/admin/spaces/${spaceId}/pages/${node.id}/edit`;

  return (
    <li ref={setNodeRef} style={style} className="border-l border-border pl-4 py-2 first:pt-0">
      <div className="flex items-center gap-2 group">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <Link
          href={href}
          className="text-sm font-medium hover:text-primary transition-colors flex-1 truncate"
        >
          {node.title}
        </Link>
        <Link
          href={editHref}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          title="Chỉnh sửa"
          aria-label="Chỉnh sửa"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </li>
  );
}

interface SortableTreeProps {
  spaceId: string;
  spaceSlug: string;
  nodes: TreeNode[];
}

export function SortableTree({ spaceId, spaceSlug, nodes: initialNodes }: SortableTreeProps) {
  const [nodes, setNodes] = useState(initialNodes);
  const { mutate: reorderPages } = useReorderPages(spaceId);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setNodes((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);

      // Update sort_order for all affected items
      const updates = newItems.map((item, index) => ({
        id: item.id,
        sort_order: index,
      }));

      // Call API to persist changes
      reorderPages(updates);

      return newItems;
    });
  };

  if (nodes.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>Chưa có trang nào.</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-1">
          {nodes.map((node) => (
            <SortableItem
              key={node.id}
              node={node}
              spaceId={spaceId}
              spaceSlug={spaceSlug}
              path={[node.slug]}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
