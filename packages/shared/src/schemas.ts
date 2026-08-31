import { z } from "zod";

export const createSpaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  icon: z.string().max(50).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  organization_id: z.string().uuid().optional().nullable(),
});

export const updateSpaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional().nullable(),
});

export const createPageSchema = z.object({
  space_id: z.string().uuid(),
  parent_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9_-]+$/),
  template_id: z.string().uuid().optional().nullable(),
});

export const updatePageSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9_-]+$/).optional(),
  parent_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().min(0).max(1_000_000).optional(),
});

export const createVersionSchema = z
  .object({
    // Keep a single document comfortably below the API body limit and avoid
    // expensive markdown parsing or version-history responses from oversized input.
    content_md: z.string().max(1_000_000).optional().nullable(),
    content_json: z.record(z.unknown()).optional().nullable(),
    summary: z.string().max(500).optional().nullable(),
    // Autosaves update their own draft version instead of appending one row
    // every few seconds. Manual saves and publish operations remain snapshots.
    draft_update: z.boolean().optional().default(false),
  })
  .refine(
    (version) =>
      (version.content_md !== undefined && version.content_md !== null) ||
      (version.content_json !== undefined && version.content_json !== null),
    { message: "content_md or content_json is required" }
  );

export const publishSchema = z.object({
  version_id: z.string().uuid(),
});

export const reorderPagesSchema = z
  .array(
    z
      .object({
        id: z.string().uuid(),
        sort_order: z.number().int().min(0).max(1_000_000),
        parent_id: z.string().uuid().nullable().optional(),
      })
      .strict()
  )
  .min(1)
  .max(50)
  .superRefine((updates, ctx) => {
    const ids = new Set<string>();
    for (const [index, update] of updates.entries()) {
      if (ids.has(update.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "id"],
          message: "Each page may only be reordered once per request",
        });
      }
      ids.add(update.id);
    }
  });

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(200),
  space: z.string().uuid().optional(),
  tags: z
    .string()
    .trim()
    .max(739)
    .refine(
      (value) => value.split(",").length <= 20 && value.split(",").every((id) => z.string().uuid().safeParse(id).success),
      "tags must be a comma-separated list of up to 20 UUIDs"
    )
    .optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parent_id: z.string().uuid().optional().nullable(),
  version_id: z.string().uuid().optional().nullable(),
});
