import { z } from "zod";

export const createSpaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  icon: z.string().max(50).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

export const createPageSchema = z.object({
  space_id: z.string().uuid(),
  parent_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-_/]+$/),
  template_id: z.string().uuid().optional().nullable(),
});

export const updatePageSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-_/]+$/).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  sort_order: z.number().int().optional(),
});

export const createVersionSchema = z.object({
  content_md: z.string().optional().nullable(),
  content_json: z.record(z.unknown()).optional().nullable(),
  summary: z.string().max(500).optional().nullable(),
});

export const publishSchema = z.object({
  version_id: z.string().uuid(),
});

export const searchQuerySchema = z.object({
  q: z.string().optional(),
  space: z.string().uuid().optional(),
  tags: z.string().optional(), // comma-separated label ids
  status: z.enum(["draft", "published", "archived"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parent_id: z.string().uuid().optional().nullable(),
  version_id: z.string().uuid().optional().nullable(),
});
