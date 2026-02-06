import { getServerAccessToken } from "@/lib/auth/supabase-server";
import { serverApiGet } from "@/lib/api/server";
import { TrashPageContent } from "@/components/trash/TrashPageContent";
import type { ApiResponse, TrashItem } from "@/lib/api/types";

async function getTrash(token: string): Promise<TrashItem[]> {
  try {
    const res = await serverApiGet<ApiResponse<TrashItem[]>>("/api/trash", token);
    return res.data;
  } catch {
    return [];
  }
}

export default async function TrashPage() {
  const token = await getServerAccessToken();

  const items = await getTrash(token);

  return <TrashPageContent items={items} />;
}
