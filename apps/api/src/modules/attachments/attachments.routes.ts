import { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { createClient } from "@supabase/supabase-js";
import { config } from "../../config/env.js";
import type { AuthHandlers } from "../../routes/auth-types.js";
import * as attachmentsRepo from "./attachments.repo.js";
import { pool } from "../../db/pool.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIMES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf", "text/plain", "text/markdown",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 100);
}

export async function attachmentsRoutes(fastify: FastifyInstance, auth: AuthHandlers) {
  await fastify.register(multipart, { limits: { fileSize: MAX_FILE_SIZE } });

  const supabase = createClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey || config.supabaseAnonKey
  );

  fastify.post(
    "/pages/:id/attachments/upload-path",
    { preHandler: [auth.authenticate, auth.requirePageRole("editor")] },
    async (request, reply) => {
      const { id: pageId } = request.params as { id: string };
      const body = request.body as { filename?: string; mime_type?: string; size_bytes?: number };
      const { filename, mime_type, size_bytes } = body;
      if (!filename || !mime_type || typeof size_bytes !== "number") {
        return reply.status(400).send({
          status: "error",
          message: "filename, mime_type, and size_bytes required",
        });
      }
      if (size_bytes > MAX_FILE_SIZE) {
        return reply.status(400).send({
          status: "error",
          message: "File too large",
        });
      }
      if (!ALLOWED_MIMES.includes(mime_type)) {
        return reply.status(400).send({
          status: "error",
          message: "File type not allowed",
        });
      }
      const safeName = sanitizeFilename(filename);
      const path = `${pageId}/${Date.now()}-${safeName}`;
      return { data: { path } };
    }
  );

  fastify.post(
    "/pages/:id/attachments/register",
    { preHandler: [auth.authenticate, auth.requirePageRole("editor")] },
    async (request, reply) => {
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
      const expectedPrefix = `${pageId}/`;
      if (!path.startsWith(expectedPrefix)) {
        return reply.status(400).send({
          status: "error",
          message: "Invalid path",
        });
      }
      const attachment = await attachmentsRepo.create({
        pageId,
        filePath: path,
        mimeType: mime_type,
        sizeBytes: size_bytes,
        uploadedBy: userId,
      });
      return reply.status(201).send({ data: attachment });
    }
  );

  fastify.post(
    "/pages/:id/attachments",
    { preHandler: [auth.authenticate, auth.requirePageRole("editor")] },
    async (request, reply) => {
      const { id: pageId } = request.params as { id: string };
      const userId = request.user!.id;
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ status: "error", message: "No file uploaded" });
      }
      const buffer = await data.toBuffer();
      const filePath = `${pageId}/${Date.now()}-${data.filename}`;

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(filePath, buffer, { contentType: data.mimetype, upsert: false });

      if (uploadError) {
        request.log.error(uploadError);
        return reply.status(500).send({ status: "error", message: "Upload failed" });
      }

      const attachment = await attachmentsRepo.create({
        pageId,
        filePath,
        mimeType: data.mimetype,
        sizeBytes: buffer.length,
        uploadedBy: userId,
      });
      return reply.status(201).send({ data: attachment });
    }
  );

  fastify.get(
    "/attachments/:id/signed-url",
    { preHandler: [auth.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const attachment = await attachmentsRepo.getById(id);
      if (!attachment) {
        return reply.status(404).send({ status: "error", message: "Attachment not found" });
      }

      const pageId = attachment.page_id;
      const userId = request.user!.id;

      // Check user has access to the page's space
      const { rows } = await pool.query(
        `SELECT 1 FROM pages p
         JOIN memberships m ON m.space_id = p.space_id AND m.user_id = $1
         WHERE p.id = $2`,
        [userId, pageId]
      );

      if (rows.length === 0) {
        return reply.status(403).send({ status: "error", message: "Access denied" });
      }

      const { data, error } = await supabase.storage
        .from("attachments")
        .createSignedUrl(attachment.file_path, 3600);

      if (error || !data?.signedUrl) {
        return reply.status(500).send({ status: "error", message: "Failed to create signed URL" });
      }
      return { data: { url: data.signedUrl, expiresIn: 3600 } };
    }
  );
}
