import { NewPageForm } from "@/components/editor/NewPageForm";

export default async function NewPage({
  params,
  searchParams,
}: {
  params: Promise<{ spaceId: string }>;
  searchParams?: { parentId?: string };
}) {
  const { spaceId } = await params;
  const parentId = typeof searchParams?.parentId === "string" ? searchParams.parentId : undefined;
  return (
    <div className="p-8">
      <NewPageForm spaceId={spaceId} parentId={parentId} />
    </div>
  );
}
