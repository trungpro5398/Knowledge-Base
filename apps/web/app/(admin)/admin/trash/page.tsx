import { createServerSupabaseClient } from "@/lib/auth/supabase-server";
import { apiClient } from "@/lib/api/client";
import { TrashPageContent } from "@/components/trash/TrashPageContent";
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

  return <TrashPageContent items={items} />;
}
