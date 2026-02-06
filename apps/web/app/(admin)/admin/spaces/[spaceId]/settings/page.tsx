import { getServerAccessToken } from "@/lib/auth/supabase-server";
import { serverApiGet } from "@/lib/api/server";
import { MembersList } from "@/components/spaces/MembersList";
import { Settings, Users } from "lucide-react";
import type { ApiResponse, Space } from "@/lib/api/types";
import { redirect } from "next/navigation";

async function getSpace(spaceId: string, token: string): Promise<Space | null> {
  try {
    const res = await serverApiGet<ApiResponse<Space>>(`/api/spaces/${spaceId}`, token);
    return res.data;
  } catch {
    return null;
  }
}

export default async function SpaceSettingsPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  const token = await getServerAccessToken();

  const space = await getSpace(spaceId, token);
  if (!space) {
    redirect("/admin");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Cài đặt Space</h1>
        </div>
        <p className="text-muted-foreground">{space.name}</p>
      </div>

      <div className="space-y-8">
        <section>
          <MembersList spaceId={spaceId} />
        </section>
      </div>
    </div>
  );
}
