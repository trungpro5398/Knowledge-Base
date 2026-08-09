import { NewPageForm } from "@/components/editor/NewPageForm";

export default async function NewPage({
  params,
  searchParams,
}: {
  params: Promise<{ spaceId: string }>;
  searchParams?: Promise<{ parentId?: string }>;
}) {
  const { spaceId } = await params;
  const query = await searchParams;
  const parentId = typeof query?.parentId === "string" ? query.parentId : undefined;
  return (
    <div className="p-8">
      <NewPageForm spaceId={spaceId} parentId={parentId} />
    </div>
  );
}
