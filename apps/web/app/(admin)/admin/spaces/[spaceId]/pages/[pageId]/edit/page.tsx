import { redirect } from "next/navigation";

export default async function EditPage({
  params,
}: {
  params: Promise<{ spaceId: string; pageId: string }>;
}) {
  const { spaceId, pageId } = await params;
  // Redirect old edit route to new unified route
  redirect(`/admin/spaces/${spaceId}/${pageId}`);
}

