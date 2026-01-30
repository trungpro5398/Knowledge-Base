import { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { createClient } from "@supabase/supabase-js";
import { config } from "../../config/env.js";
import * as attachmentsRepo from "./attachments.repo.js";
import { pool } from "../../db/pool.js";

export async function attachmentsRoutes(fastify: FastifyInstance) {
  await fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey || config.supabaseAnonKey);

  fastify.post(
    "/pages/:id/attachments",
    { preHandler: [fastify.authenticate, fastify.requirePageRole("editor")] },
    async (request, reply) => {
      const { id: pageId } = request.params as { id: string };
      const userId = request.user!.id;
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ status: "error", message: "No file uploaded" });
      }
      const buffer = await data.toBuffer();
      const ext = data.filename.split(".").pop() || "bin";
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
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const attachment = await attachmentsRepo.getById(id);
      if (!attachment) {
        return reply.status(404).send({ status: "error", message: "Attachment not found" });
      }
      const pageId = attachment.page_id;
      const userId = request.user!.id;
      if (pool) {
        const { rows } = await pool.query(
          `SELECT 1 FROM pages p
           JOIN memberships m ON m.space_id = p.space_id AND m.user_id = $1
           WHERE p.id = $2`,
          [userId, pageId]
        );
        if (rows.length === 0) {
          return reply.status(403).send({ status: "error", message: "Access denied" });
        }
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
