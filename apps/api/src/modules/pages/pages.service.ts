import * as pagesRepo from "./pages.repo.js";
import * as templatesRepo from "./templates.repo.js";
import { config } from "../../config/env.js";
import { NotFoundError, ValidationError } from "../../utils/errors.js";
import { compileMarkdown } from "../../utils/markdown.js";
import type { PageRow } from "./pages.repo.js";

async function callRevalidate(path: string, tag: string): Promise<void> {
  if (!config.webRevalidateUrl || !config.revalidateSecret) return;
  try {
    const res = await fetch(config.webRevalidateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.revalidateSecret}`,
      },
      body: JSON.stringify({ path, tag }),
    });
    if (!res.ok) {
      console.error("Revalidate webhook failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Revalidate webhook error:", err);
  }
}

function buildTree(pages: PageRow[], parentId: string | null = null): (PageRow & { children: (PageRow & { children: unknown[] })[] })[] {
  return pages
    .filter((p) => p.parent_id === parentId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.path).localeCompare(String(b.path)))
    .map((p) => ({
      ...p,
      children: buildTree(pages, p.id),
    }));
}

export async function getPagesTree(
  spaceId: string,
  options?: { publishedOnly?: boolean }
) {
  const pages = await pagesRepo.getPagesTree(spaceId, options);
  return buildTree(pages);
}

export async function getPage(id: string) {
  const page = await pagesRepo.getPageById(id);
  if (!page) throw new NotFoundError("Page not found");
  return page;
}

export async function getPageByPath(spaceId: string, path: string) {
  const page = await pagesRepo.getPageByPath(spaceId, path);
  if (!page) throw new NotFoundError("Page not found");
  return page;
}

export async function createPage(
  data: { spaceId: string; parentId?: string | null; title: string; slug: string; templateId?: string | null },
  userId: string
) {
  const page = await pagesRepo.createPage({
    spaceId: data.spaceId,
    parentId: data.parentId ?? null,
    title: data.title,
    slug: data.slug,
    createdBy: userId,
  });
  if (data.templateId) {
    const template = await templatesRepo.getTemplateById(data.templateId);
    if (template && template.space_id === data.spaceId && template.content_md) {
      const version = await pagesRepo.createVersion({
        pageId: page.id,
        contentMd: template.content_md,
        contentJson: null,
        summary: null,
        createdBy: userId,
      });
      await pagesRepo.setCurrentVersion(page.id, version.id);
      return pagesRepo.getPageById(page.id) as Promise<PageRow & { version?: unknown }>;
    }
  }
  return page;
}

export async function updatePage(
  id: string,
  data: { title?: string; slug?: string; parent_id?: string | null; status?: string; sort_order?: number }
) {
  const updated = await pagesRepo.updatePage(id, data);
  if (!updated) throw new NotFoundError("Page not found");
  return updated;
}

export async function createVersion(
  pageId: string,
  data: { contentMd?: string; contentJson?: Record<string, unknown>; summary?: string },
  userId: string
) {
  const version = await pagesRepo.createVersion({
    pageId,
    contentMd: data.contentMd ?? null,
    contentJson: data.contentJson ?? null,
    summary: data.summary ?? null,
    createdBy: userId,
  });
  // Luôn cập nhật current_version để reload hiển thị đúng bản mới (autosave hoặc publish)
  await pagesRepo.setCurrentVersion(pageId, version.id);
  return version;
}

export async function publishPage(pageId: string, versionId: string) {
  const page = await pagesRepo.getPageById(pageId);
  if (!page) throw new NotFoundError("Page not found");
  const version = await pagesRepo.getVersionById(versionId);
  if (!version) throw new NotFoundError("Version not found");
  const contentMd = version.content_md ?? "";
  const { html, toc } = await compileMarkdown(contentMd);
  await pagesRepo.updateVersionRendered(versionId, html, toc);
  await pagesRepo.setCurrentVersion(pageId, versionId);
  await pagesRepo.updatePage(pageId, { status: "published" });

  const space = await import("../spaces/spaces.repo.js").then((m) =>
    m.getSpaceById(page.space_id)
  );
  if (space) {
    const pathSegments = (page.path as string).split(".").filter(Boolean);
    const kbPath = pathSegments.length > 0
      ? `/kb/${space.slug}/${pathSegments.join("/")}`
      : `/kb/${space.slug}`;
    await callRevalidate(kbPath, "kb");
  }

  return pagesRepo.getPageById(pageId);
}

export async function listVersions(pageId: string) {
  return pagesRepo.listVersions(pageId);
}

export async function reorderPages(
  spaceId: string,
  updates: Array<{ id: string; sort_order: number; parent_id?: string | null }>
): Promise<void> {
  // Batch update all pages in a transaction
  for (const update of updates) {
    const data: { sort_order?: number; parent_id?: string | null } = {};
    if (update.sort_order !== undefined) data.sort_order = update.sort_order;
    if (update.parent_id !== undefined) data.parent_id = update.parent_id;
    
    if (Object.keys(data).length > 0) {
      await pagesRepo.updatePage(update.id, data);
    }
  }
}

export async function softDeletePage(pageId: string, userId: string) {
  const page = await pagesRepo.getPageById(pageId);
  if (!page) throw new NotFoundError("Page not found");
  await pagesRepo.softDeletePage(pageId, userId);
}

export async function restorePage(pageId: string) {
  await pagesRepo.restoreFromTrash(pageId);
}
