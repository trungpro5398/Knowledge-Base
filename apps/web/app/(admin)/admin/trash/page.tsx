import { createServerSupabaseClient } from "@/lib/auth/supabase-server";
import { apiClient } from "@/lib/api/client";
import { RestoreButton } from "@/components/trash/RestoreButton";

async function getTrash(token: string) {
  try {
    const res = await apiClient("/api/trash", { token });
    return res.data as { page_id: string; deleted_at: string }[];
  } catch {
    return [];
  }
}

export default async function TrashPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";

  const items = await getTrash(token);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Recycle bin</h1>
      {items.length === 0 ? (
        <p className="text-muted-foreground">No deleted pages.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.page_id} className="flex items-center justify-between p-2 border rounded">
              <span>{item.page_id}</span>
              <span className="text-sm text-muted-foreground">
                {new Date(item.deleted_at).toLocaleDateString()}
              </span>
              <RestoreButton pageId={item.page_id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
