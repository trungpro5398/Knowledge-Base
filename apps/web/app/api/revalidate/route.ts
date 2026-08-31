import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;
const MAX_REVALIDATE_PATH_LENGTH = 1_024;

function isSafeRevalidatePath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    path.length <= MAX_REVALIDATE_PATH_LENGTH
  );
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secretHeader = request.headers.get("x-revalidate-secret");
  const token = authHeader?.replace(/^Bearer\s+/i, "") ?? secretHeader;

  if (!REVALIDATE_SECRET || token !== REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { path?: string; tag?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { path, tag } = body;
  if (!path && !tag) {
    return NextResponse.json({ error: "path or tag is required" }, { status: 400 });
  }
  if (path && !isSafeRevalidatePath(path)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  if (tag && tag !== "kb") {
    return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
  }

  if (path) {
    revalidatePath(path);
  }
  if (tag) {
    revalidateTag(tag);
  }

  return NextResponse.json({ revalidated: true, path, tag });
}
