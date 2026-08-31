import { z } from "zod";

const commentCursorSchema = z
  .object({
    createdAt: z.string().datetime({ offset: true }),
    id: z.string().uuid(),
  })
  .strict();

export type CommentCursor = z.infer<typeof commentCursorSchema>;

export function decodeCommentCursor(value: string): CommentCursor | null {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    return commentCursorSchema.safeParse(JSON.parse(decoded)).data ?? null;
  } catch {
    return null;
  }
}

export function encodeCommentCursor(createdAt: string, id: string): string {
  return Buffer.from(
    JSON.stringify({ createdAt, id }),
    "utf8"
  ).toString("base64url");
}
