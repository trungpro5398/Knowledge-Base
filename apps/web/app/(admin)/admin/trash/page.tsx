import { createServerSupabaseClient } from "@/lib/auth/supabase-server";
import { apiClient } from "@/lib/api/client";
import { RestoreButton } from "@/components/trash/RestoreButton";
import { Trash2 } from "lucide-react";
import type { ApiResponse, TrashItem } from "@/lib/api/types";

async function getTrash(token: string): Promise<TrashItem[]> {
  try {
    const res = await apiClient<ApiResponse<TrashItem[]>>("/api/trash", { token });
    return res.data;
  } catch {
    return [];
  }
}

export default async function TrashPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } };
  const token = session?.access_token ?? "";

  const items = await getTrash(token);

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Thùng rác</h1>
        <p className="text-muted-foreground mt-1">Các trang đã xóa, có thể khôi phục</p>
      </div>
      {items.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Trash2 className="h-12 w-12 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Chưa có trang nào trong thùng rác</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.page_id}
              className="card flex items-center justify-between gap-4 p-4"
            >
              <span className="font-mono text-sm truncate flex-1">{item.page_id}</span>
              <span className="text-sm text-muted-foreground shrink-0">
                {new Date(item.deleted_at).toLocaleDateString("vi-VN")}
              </span>
              <RestoreButton pageId={item.page_id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
