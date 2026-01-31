import { apiClient } from "./client";
import type { ApiResponse, Page, PageNode, PageTemplate } from "./types";

export type { Page, PageNode, PageTemplate };

export async function getPagesTree(spaceId: string): Promise<PageNode[]> {
  const res = await apiClient<ApiResponse<PageNode[]>>(`/api/spaces/${spaceId}/pages/tree`);
  return res.data;
}

export async function getTemplates(spaceId: string): Promise<PageTemplate[]> {
  const res = await apiClient<ApiResponse<PageTemplate[]>>(`/api/spaces/${spaceId}/templates`);
  return res.data;
}

export async function getPage(id: string): Promise<Page> {
  const res = await apiClient<ApiResponse<Page>>(`/api/pages/${id}`);
  return res.data;
}
