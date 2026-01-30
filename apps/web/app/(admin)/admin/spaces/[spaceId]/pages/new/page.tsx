import { NewPageForm } from "@/components/editor/NewPageForm";

export default async function NewPage({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  return (
    <div className="p-8">
      <NewPageForm spaceId={spaceId} />
    </div>
  );
}
