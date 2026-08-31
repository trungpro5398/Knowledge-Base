const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").trim();
const LEGACY_PUBLIC_PREFIX = "/storage/v1/object/public/attachments/";

export function publicAttachmentUrl(path: string): string {
  return `${API_URL}/api/public/attachments?path=${encodeURIComponent(path)}`;
}

/** Converts legacy Supabase public URLs so private bucket files keep working. */
export function rewriteLegacyAttachmentUrl(src: string): string {
  try {
    const url = new URL(src);
    const index = url.pathname.indexOf(LEGACY_PUBLIC_PREFIX);
    if (index === -1) return src;
    const path = decodeURIComponent(url.pathname.slice(index + LEGACY_PUBLIC_PREFIX.length));
    return path ? publicAttachmentUrl(path) : src;
  } catch {
    return src;
  }
}
