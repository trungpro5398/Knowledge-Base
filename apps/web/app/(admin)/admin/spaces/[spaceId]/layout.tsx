import { createServerSupabaseClient } from "@/lib/auth/supabase-server";
import { apiClient } from "@/lib/api/client";
import { PageTree, type TreeNode } from "@/components/kb/PageTree";
import { Plus } from "lucide-react";
import Link from "next/link";
import type { ApiResponse, Space, PageNode } from "@/lib/api/types";
import { TET_PROSYS_GROUPS } from "@/lib/kb/sidebar-groups";
import { cn } from "@/lib/utils";

async function getSpace(spaceId: string, token: string): Promise<Space | null> {
  try {
    const res = await apiClient<ApiResponse<Space>>(`/api/spaces/${spaceId}`, { token });
    return res.data;
  } catch {
    return null;
  }
}

async function getTree(spaceId: string, token: string): Promise<TreeNode[]> {
  try {
    const res = await apiClient<ApiResponse<PageNode[]>>(`/api/spaces/${spaceId}/pages/tree`, { token });
    return res.data as TreeNode[];
  } catch {
    return [];
  }
}

async function getSpaces(token: string): Promise<Space[]> {
  try {
    const res = await apiClient<ApiResponse<Space[]>>("/api/spaces", { token });
    return res.data;
  } catch {
    return [];
  }
}

export default async function SpaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } };
  const token = session?.access_token ?? "";

  const [space, tree, spaces] = await Promise.all([
    getSpace(spaceId, token),
    getTree(spaceId, token),
    getSpaces(token),
  ]);

  if (!space) {
    return (
      <div className="p-8">
        <p>Space không tồn tại</p>
      </div>
    );
  }

  const useGroupedSidebar = space.slug === "tet-prosys";
  const enableDragAndDrop = true;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Space</span>
            <h1 className="text-lg font-semibold">{space.name}</h1>
            <span className="text-xs text-muted-foreground font-mono">
              /kb/{space.slug}
            </span>
          </div>
          <Link
            href={`/admin/spaces/${spaceId}/pages/new`}
            className="btn-primary h-9 px-3 text-sm gap-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tạo trang
          </Link>
        </div>
      </header>

      {/* Main content: sidebar + editor */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar: Page Tree */}
        <aside className="hidden lg:block w-72 border-r border-border bg-card/40 overflow-y-auto shrink-0">
          <div className="p-4 border-b border-border/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Spaces
              </span>
              <Link
                href="/admin"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                + Tạo
              </Link>
            </div>
            <div className="mt-3 space-y-1">
              {spaces.map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/spaces/${item.id}`}
                  className={cn(
                    "flex flex-col gap-0.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/60",
                    item.id === space.id && "bg-primary/10 text-primary"
                  )}
                >
                  <span className="font-medium truncate">{item.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    /kb/{item.slug}
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="p-4">
            <PageTree
              spaceId={spaceId}
              spaceSlug={space.slug}
              nodes={tree}
              linkMode="admin"
              showEditLink={false}
              showCreateLink
              showCreateChild
              enableDragAndDrop={enableDragAndDrop}
              groupConfig={!enableDragAndDrop && useGroupedSidebar ? TET_PROSYS_GROUPS : undefined}
            />
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto min-w-0">{children}</main>
      </div>
    </div>
  );
}
