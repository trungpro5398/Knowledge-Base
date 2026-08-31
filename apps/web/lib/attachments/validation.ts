export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_ATTACHMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const ATTACHMENT_INPUT_ACCEPT = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  ".doc",
  ".docx",
].join(",");

export function validateAttachmentFile(file: Pick<File, "type" | "size">): string | null {
  if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return "Tệp phải có kích thước tối đa 10 MB.";
  }
  if (!ALLOWED_ATTACHMENT_MIME_TYPES.has(file.type)) {
    return "Định dạng tệp không được hỗ trợ.";
  }
  return null;
}
