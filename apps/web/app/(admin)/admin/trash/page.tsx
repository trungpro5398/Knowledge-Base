import { createServerSupabaseClient } from "@/lib/auth/supabase-server";
import { apiClient } from "@/lib/api/client";
import { RestoreButton } from "@/components/trash/RestoreButton";
import { DeleteButton } from "@/components/trash/DeleteButton";
import { Trash2, FileText, Clock } from "lucide-react";
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
    <div className="p-6 sm:p-8 max-w-4xl w-full mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-balance">Thùng rác</h1>
          <p className="text-muted-foreground mt-1">
            Các trang đã xóa, có thể khôi phục hoặc xóa hẳn
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          {items.length} mục
        </span>
      </div>
      {items.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Trash2 className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="text-muted-foreground">Chưa có trang nào trong thùng rác</p>
        </div>
      ) : (
        <ul className="rounded-xl border bg-card/70 divide-y">
          {items.map((item) => (
            <li
              key={item.page_id}
              className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-1 rounded-md bg-muted p-2">
                  <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{item.title || "Untitled"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {item.path}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums md:mr-2">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {new Date(item.deleted_at).toLocaleDateString("vi-VN")}
              </div>

              <div className="flex items-center gap-2">
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
