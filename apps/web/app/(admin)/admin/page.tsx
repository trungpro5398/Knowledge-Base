import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/auth/supabase-server";
import { apiClient } from "@/lib/api/client";
import { CreateSpaceForm } from "@/components/spaces/CreateSpaceForm";

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
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <CreateSpaceForm />
      <div className="grid gap-4">
        {spaces.length === 0 ? (
          <p className="text-muted-foreground">No spaces yet. Create one to get started.</p>
        ) : (
          spaces.map((space) => (
            <Link
              key={space.id}
              href={`/admin/spaces/${space.id}/tree`}
              className="block p-4 border rounded-lg hover:bg-muted"
            >
              <h2 className="font-semibold">{space.name}</h2>
              <p className="text-sm text-muted-foreground">{space.slug}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
