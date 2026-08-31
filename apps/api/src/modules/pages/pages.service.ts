import * as pagesRepo from "./pages.repo.js";
import { invalidatePublishedSpace } from "../public/public-cache.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../../utils/errors.js";
import { compileMarkdown } from "../../utils/markdown.js";
import { buildPagesTree } from "./pages-tree.js";

export async function getPagesTree(
  spaceId: string,
  options?: { publishedOnly?: boolean }
) {
  const pages = await pagesRepo.getPagesTree(spaceId, options);
  return buildPagesTree(pages);
}

export async function getPage(id: string, options?: { publishedOnly?: boolean }) {
  const page = await pagesRepo.getPageById(id, false, options?.publishedOnly ? "published" : "current");
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
  const result = await pagesRepo.createPageForEditor({
    spaceId: data.spaceId,
    parentId: data.parentId ?? null,
    title: data.title,
    slug: data.slug,
    templateId: data.templateId ?? null,
    actorUserId: userId,
  });
  if (result.status === "not_member") {
    throw new ForbiddenError("Not a member of this space");
  }
  if (result.status === "requires_editor") {
    throw new ForbiddenError("Requires editor role or higher");
  }
  if (result.status === "invalid_parent") {
    throw new ValidationError("Parent page must belong to the same space");
  }
  if (result.status === "path_conflict") {
    throw new ValidationError("Đường dẫn trang đã tồn tại");
  }
  if (result.status !== "success" || !result.page) {
    throw new Error(`Unexpected page creation result: ${result.status}`);
  }
  return result.page;
}

export async function updatePage(
  id: string,
  data: { title?: string; slug?: string; parent_id?: string | null; sort_order?: number },
  userId: string
) {
  const result = await pagesRepo.updatePageForEditor(id, userId, data);
  if (result.status === "page_not_found") {
    throw new NotFoundError("Page not found");
  }
  if (result.status === "not_member") {
    throw new ForbiddenError("Not a member of this space");
  }
  if (result.status === "requires_editor") {
    throw new ForbiddenError("Requires editor role or higher");
  }
  if (result.status === "invalid_parent") {
    throw new ValidationError("Parent page must belong to the same space");
  }
  if (result.status === "cyclic_parent") {
    throw new ValidationError("Không thể kéo trang vào chính nó hoặc trang con");
  }
  if (result.status === "path_conflict") {
    throw new ValidationError("Đường dẫn trang đã tồn tại");
  }
  if (
    result.status === "invalid_title" ||
    result.status === "invalid_slug" ||
    result.status === "invalid_sort_order"
  ) {
    throw new ValidationError("Invalid page update");
  }
  if (result.status !== "success" || !result.page) {
    throw new Error(`Unexpected page update result: ${result.status}`);
  }
  if (result.affects_published) {
    invalidatePublishedSpace(result.page.space_id);
  }
  return result.page;
}

export async function createVersion(
  pageId: string,
  data: {
    contentMd?: string;
    contentJson?: Record<string, unknown>;
    summary?: string;
    draftUpdate?: boolean;
  },
  userId: string
) {
  const result = await pagesRepo.savePageVersionForEditor({
    pageId,
    contentMd: data.contentMd ?? null,
    contentJson: data.contentJson ?? null,
    summary: data.summary ?? null,
    draftUpdate: data.draftUpdate ?? false,
    actorUserId: userId,
  });
  if (result.status === "page_not_found") {
    throw new NotFoundError("Page not found");
  }
  if (result.status === "not_member") {
    throw new ForbiddenError("Not a member of this space");
  }
  if (result.status === "requires_editor") {
    throw new ForbiddenError("Requires editor role or higher");
  }
  if (result.status === "invalid_content" || result.status === "invalid_summary") {
    throw new ValidationError("Invalid page version");
  }
  if (result.status !== "success" || !result.version) {
    throw new Error(`Unexpected page version save result: ${result.status}`);
  }
  return result.version;
}

export async function publishPage(pageId: string, versionId: string, userId: string) {
  const sourceResult = await pagesRepo.getPublishSourceForEditor(pageId, versionId, userId);
  if (sourceResult.status === "page_not_found" || sourceResult.status === "source_not_found") {
    throw new NotFoundError("Page or version not found");
  }
  if (sourceResult.status === "not_member") {
    throw new ForbiddenError("Not a member of this space");
  }
  if (sourceResult.status === "requires_editor") {
    throw new ForbiddenError("Requires editor role or higher");
  }
  if (sourceResult.status !== "success" || !sourceResult.source) {
    throw new Error(`Unexpected publish source result: ${sourceResult.status}`);
  }
  const contentMd = sourceResult.source.content_md ?? "";
  const { html, toc } = await compileMarkdown(contentMd);
  // Publish an immutable snapshot rather than the mutable autosave row. A
  // concurrent autosave may still update its draft, but it can never alter
  // the version exposed through published_version_id.
  const publishResult = await pagesRepo.publishPageVersionForEditor({
    pageId,
    sourceVersionId: versionId,
    sourceContentHash: sourceResult.source.content_hash,
    renderedHtml: html,
    tocJson: toc,
    actorUserId: userId,
  });
  if (publishResult.status === "not_member") {
    throw new ForbiddenError("Not a member of this space");
  }
  if (publishResult.status === "requires_editor") {
    throw new ForbiddenError("Requires editor role or higher");
  }
  if (
    publishResult.status === "page_not_found" ||
    publishResult.status === "source_not_found" ||
    publishResult.status === "source_changed"
  ) {
    throw new ValidationError("Page or version changed while publishing");
  }
  if (publishResult.status === "invalid_rendered_output") {
    throw new ValidationError("Rendered page is too large or invalid");
  }
  if (publishResult.status !== "success" || !publishResult.page) {
    throw new Error(`Unexpected page publish result: ${publishResult.status}`);
  }

  invalidatePublishedSpace(publishResult.page.space_id);
  return publishResult.page;
}

export async function listVersions(pageId: string) {
  return pagesRepo.listVersions(pageId);
}

export async function getVersion(pageId: string, versionId: string) {
  const version = await pagesRepo.getVersionById(versionId);
  if (!version || version.page_id !== pageId) {
    throw new NotFoundError("Version not found");
  }
  return version;
}

export async function reorderPages(
  spaceId: string,
  updates: Array<{ id: string; sort_order: number; parent_id?: string | null }>,
  userId: string
): Promise<void> {
  const result = await pagesRepo.reorderPagesForEditor(spaceId, userId, updates);
  if (result.status === "not_member") {
    throw new ForbiddenError("Not a member of this space");
  }
  if (result.status === "requires_editor") {
    throw new ForbiddenError("Requires editor role or higher");
  }
  if (result.status === "page_not_found") {
    throw new NotFoundError("Page not found");
  }
  if (result.status === "invalid_parent") {
    throw new ValidationError("Parent page must belong to the target space");
  }
  if (result.status === "cyclic_parent") {
    throw new ValidationError("Không thể kéo trang vào chính nó hoặc trang con");
  }
  if (result.status === "path_conflict") {
    throw new ValidationError("Đường dẫn trang đã tồn tại, vui lòng đổi vị trí khác");
  }
  if (result.status === "invalid_updates") {
    throw new ValidationError("Invalid page reorder request");
  }
  if (result.status !== "success") {
    throw new Error(`Unexpected page reorder result: ${result.status}`);
  }
  if (result.affects_published) {
    invalidatePublishedSpace(spaceId);
  }
}

export async function softDeletePage(pageId: string, userId: string) {
  const result = await mutatePageTrash("trash", pageId, userId);
  invalidatePageTrashMutation(result);
}

export async function restorePage(pageId: string, userId: string) {
  const result = await mutatePageTrash("restore", pageId, userId);
  invalidatePageTrashMutation(result);
}

export async function purgePage(pageId: string, userId: string) {
  const result = await mutatePageTrash("purge", pageId, userId);
  invalidatePageTrashMutation(result);
  return result;
}

async function mutatePageTrash(
  action: pagesRepo.PageTrashAction,
  pageId: string,
  userId: string
): Promise<pagesRepo.PageTrashMutationResult> {
  const result = await pagesRepo.mutatePageTrash(action, pageId, userId);
  if (result.status === "page_not_found") {
    throw new NotFoundError("Page not found");
  }
  if (result.status === "not_in_trash") {
    throw new NotFoundError("Page not found in trash");
  }
  if (result.status === "not_member") {
    throw new ForbiddenError("Not a member of this space");
  }
  if (result.status === "requires_editor") {
    throw new ForbiddenError("Requires editor role or higher");
  }
  if (result.status !== "success" || !result.page) {
    throw new Error(`Unexpected page trash mutation result: ${result.status}`);
  }
  return result;
}

function invalidatePageTrashMutation(result: pagesRepo.PageTrashMutationResult): void {
  if (result.affects_published && result.page) {
    invalidatePublishedSpace(result.page.space_id);
  }
}
