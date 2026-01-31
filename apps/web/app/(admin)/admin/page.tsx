import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/auth/supabase-server";
import { apiClient } from "@/lib/api/client";
import { CreateSpaceForm } from "@/components/spaces/CreateSpaceForm";
import { FolderOpen } from "lucide-react";

async function getSpaces(token: string) {
  try {
    const res = await apiClient("/api/spaces", { token });
    return res.data as { id: string; name: string; slug: string }[];
  } catch {
    return [];
  }
}

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";

  const spaces = await getSpaces(token);

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Quản lý spaces và trang KB</p>
      </div>
      <CreateSpaceForm />
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Spaces của bạn</h2>
        {spaces.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <FolderOpen className="h-12 w-12 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2">Chưa có space nào</p>
            <p className="text-sm text-muted-foreground">Tạo space mới bằng form bên trên</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {spaces.map((space) => (
              <Link
                key={space.id}
                href={`/admin/spaces/${space.id}/tree`}
                className="card flex items-start gap-4 p-5 hover:border-primary/30 hover:shadow-md transition-all group"
              >
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                    {space.name}
                  </h3>
                  <p className="text-sm text-muted-foreground font-mono">{space.slug}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
