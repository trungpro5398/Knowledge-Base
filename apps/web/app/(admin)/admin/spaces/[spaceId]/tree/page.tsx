import { redirect } from "next/navigation";

export default async function TreePage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  // Redirect old tree route to new unified space editor
  redirect(`/admin/spaces/${spaceId}`);
}

