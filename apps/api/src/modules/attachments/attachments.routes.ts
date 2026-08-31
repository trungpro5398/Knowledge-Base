import { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import type { AuthHandlers } from "../../routes/auth-types.js";
import * as attachmentsRepo from "./attachments.repo.js";
import { pool } from "../../db/pool.js";
import {
  cleanupAttachmentStorage,
  getAttachmentStorageClient,
} from "./attachment-storage.js";
import { z } from "zod";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_BUFFERED_UPLOAD_BYTES = 30 * 1024 * 1024;
const activeMultipartUsers = new Set<string>();
let reservedMultipartBytes = 0;
const ALLOWED_MIMES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf", "text/plain", "text/markdown",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function isAllowedFile(mimeType: unknown, sizeBytes: unknown): mimeType is string {
  return (
    typeof mimeType === "string" &&
    ALLOWED_MIMES.includes(mimeType) &&
    typeof sizeBytes === "number" &&
    Number.isSafeInteger(sizeBytes) &&
    sizeBytes >= 0 &&
    sizeBytes <= MAX_FILE_SIZE
  );
}

function sanitizeFilename(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 100);
  return sanitized || "attachment";
}

function createAttachmentPath(pageId: string, filename: string): string {
  return `${pageId}/${crypto.randomUUID()}-${sanitizeFilename(filename)}`;
}

function isAttachmentPathForPage(path: string, pageId: string): boolean {
  const prefix = `${pageId}/`;
  const filename = path.slice(prefix.length);
  return (
    path.startsWith(prefix) &&
    filename.length > 0 &&
    filename.length <= 160 &&
    !filename.includes("/") &&
    /^[0-9a-f-]{36}-[a-zA-Z0-9.-]+$/.test(filename)
  );
}

async function reserveUpload(
  data: { pageId: string; userId: string; path: string; mimeType: string; sizeBytes: number }
): Promise<"reserved" | "quota_exceeded"> {
  try {
    await pool.query(
      `SELECT tet_kb.reserve_attachment_upload(
        $1::uuid, $2::uuid, $3, $4, $5::integer
      )`,
      [data.pageId, data.userId, data.path, data.mimeType, data.sizeBytes]
    );
    return "reserved";
  } catch (error) {
    if (error instanceof Error && error.message.includes("Attachment quota exceeded")) {
      return "quota_exceeded";
    }
    throw error;
  }
}

export async function attachmentsRoutes(fastify: FastifyInstance, auth: AuthHandlers) {
  await fastify.register(multipart, { limits: { fileSize: MAX_FILE_SIZE } });

  const supabase = getAttachmentStorageClient();

  fastify.post(
    "/pages/:id/attachments/upload-path",
    {
      preHandler: [auth.authenticate, auth.requirePageRole("editor")],
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      await cleanupAttachmentStorage(request.log);
      const { id: pageId } = request.params as { id: string };
      const body = request.body as { filename?: string; mime_type?: string; size_bytes?: number };
      const { filename, mime_type, size_bytes } = body;
      if (!filename || !mime_type || typeof size_bytes !== "number") {
        return reply.status(400).send({
          status: "error",
          message: "filename, mime_type, and size_bytes required",
        });
      }
      if (!isAllowedFile(mime_type, size_bytes)) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid file size or type",
        });
      }
      const safeName = sanitizeFilename(filename);
      const path = createAttachmentPath(pageId, safeName);
      const reservation = await reserveUpload({
        pageId,
        userId: request.user!.id,
        path,
        mimeType: mime_type,
        sizeBytes: size_bytes,
      });
      if (reservation === "quota_exceeded") {
        request.log.warn({ pageId }, "Attachment upload quota exceeded");
        return reply.status(429).send({
          status: "error",
          message: "Attachment quota exceeded. Remove existing files or try again later.",
        });
      }
      return { data: { path } };
    }
  );

  fastify.post(
    "/pages/:id/attachments/register",
    { preHandler: [auth.authenticate, auth.requirePageRole("editor")] },
    async (request, reply) => {
      await cleanupAttachmentStorage(request.log);
      const { id: pageId } = request.params as { id: string };
      const userId = request.user!.id;
      const body = request.body as { path?: string; mime_type?: string; size_bytes?: number };
      const { path, mime_type, size_bytes } = body;
      if (!path || !mime_type || typeof size_bytes !== "number") {
        return reply.status(400).send({
          status: "error",
          message: "path, mime_type, and size_bytes required",
        });
      }
      if (!isAllowedFile(mime_type, size_bytes) || !isAttachmentPathForPage(path, pageId)) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid attachment metadata",
        });
      }
      const { data: storedFile, error: storageError } = await supabase.storage
        .from("attachments")
        .info(path);
      if (storageError || !storedFile || storedFile.contentType !== mime_type || storedFile.size !== size_bytes) {
        // A confirmed metadata mismatch cannot be registered. Remove the
        // invalid object through the Storage API before releasing its quota;
        // transient info failures keep the reservation fail-closed.
        if (storedFile && !storageError) {
          const { error: removeError } = await supabase.storage.from("attachments").remove([path]);
          if (!removeError) {
            await attachmentsRepo.cancelPendingUpload({ pageId, userId, filePath: path });
          } else {
            request.log.warn(removeError, "Failed to remove invalid attachment object");
          }
        }
        return reply.status(400).send({
          status: "error",
          message: "Uploaded file metadata could not be verified",
        });
      }
      const attachment = await attachmentsRepo.finalizePendingUpload({
        pageId,
        userId,
        filePath: path,
        mimeType: mime_type,
        sizeBytes: size_bytes,
      });
      if (!attachment) {
        return reply.status(409).send({
          status: "error",
          message: "Upload authorization expired or was already used",
        });
      }
      return reply.status(201).send({ data: attachment });
    }
  );

  fastify.post(
    "/pages/:id/attachments",
    {
      preHandler: [auth.authenticate, auth.requirePageRole("editor")],
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      await cleanupAttachmentStorage(request.log);
      const { id: pageId } = request.params as { id: string };
      const userId = request.user!.id;
      const contentLength = Number(request.headers["content-length"]);
      if (Number.isFinite(contentLength) && contentLength > MAX_FILE_SIZE + 64 * 1024) {
        return reply.status(413).send({ status: "error", message: "File is too large" });
      }
      if (activeMultipartUsers.has(userId)) {
        return reply.status(429).send({ status: "error", message: "Another upload is in progress" });
      }
      // request.file().toBuffer() retains the complete payload. Reserve the
      // worst-case buffer up front so unrelated users may upload concurrently
      // without allowing this instance to exceed a bounded memory budget.
      if (reservedMultipartBytes + MAX_FILE_SIZE > MAX_BUFFERED_UPLOAD_BYTES) {
        return reply.status(503).send({ status: "error", message: "Upload capacity is busy" });
      }
      activeMultipartUsers.add(userId);
      reservedMultipartBytes += MAX_FILE_SIZE;
      try {
        const data = await request.file();
        if (!data) {
          return reply.status(400).send({ status: "error", message: "No file uploaded" });
        }
        const buffer = await data.toBuffer();
        if (!isAllowedFile(data.mimetype, buffer.length)) {
          return reply.status(400).send({ status: "error", message: "Invalid file size or type" });
        }
        const filePath = createAttachmentPath(pageId, data.filename);
        const reservation = await reserveUpload({
          pageId,
          userId,
          path: filePath,
          mimeType: data.mimetype,
          sizeBytes: buffer.length,
        });
        if (reservation === "quota_exceeded") {
          return reply.status(429).send({ status: "error", message: "Attachment quota exceeded" });
        }

        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(filePath, buffer, { contentType: data.mimetype, upsert: false });

        if (uploadError) {
          request.log.error(uploadError);
          // A timeout can report failure after Storage accepted the object.
          // Release quota only after the Storage API confirms cleanup.
          const { error: cleanupError } = await supabase.storage.from("attachments").remove([filePath]);
          if (!cleanupError) {
            await attachmentsRepo.cancelPendingUpload({ pageId, userId, filePath });
          } else {
            request.log.warn(cleanupError, "Failed to clean up a failed attachment upload");
          }
          return reply.status(500).send({ status: "error", message: "Upload failed" });
        }

        const attachment = await attachmentsRepo.finalizePendingUpload({
          pageId,
          userId,
          filePath,
          mimeType: data.mimetype,
          sizeBytes: buffer.length,
        });
        if (!attachment) {
          const { error: removeError } = await supabase.storage.from("attachments").remove([filePath]);
          if (removeError) {
            request.log.warn(removeError, "Failed to remove unregistered attachment object");
          } else {
            await attachmentsRepo.cancelPendingUpload({ pageId, userId, filePath });
          }
          return reply.status(400).send({ status: "error", message: "Upload authorization expired" });
        }
        return reply.status(201).send({ data: attachment });
      } finally {
        activeMultipartUsers.delete(userId);
        reservedMultipartBytes = Math.max(0, reservedMultipartBytes - MAX_FILE_SIZE);
      }
    }
  );

  fastify.get(
    "/attachments/:id/signed-url",
    {
      preHandler: [auth.authenticate],
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      if (!z.string().uuid().safeParse(id).success) {
        return reply.status(400).send({ status: "error", message: "Invalid attachment ID" });
      }
      const userId = request.user!.id;
      const filePath = await attachmentsRepo.getAccessibleFilePath(id, userId);
      if (!filePath) {
        return reply.status(404).send({ status: "error", message: "Attachment not found" });
      }

      const { data, error } = await supabase.storage
        .from("attachments")
        .createSignedUrl(filePath, 3600);

      if (error || !data?.signedUrl) {
        return reply.status(500).send({ status: "error", message: "Failed to create signed URL" });
      }
      return { data: { url: data.signedUrl, expiresIn: 3600 } };
    }
  );
}
