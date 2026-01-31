import { apiClient } from "./client";

export async function getPagesTree(spaceId: string) {
  const res = await apiClient(`/api/spaces/${spaceId}/pages/tree`);
  return res.data;
}

export interface PageTemplate {
  id: string;
  space_id: string;
  name: string;
  content_md: string | null;
  created_at: string;
}

export async function getTemplates(spaceId: string): Promise<PageTemplate[]> {
  const res = await apiClient(`/api/spaces/${spaceId}/templates`);
  return res.data;
}

export async function getPage(id: string) {
  const res = await apiClient(`/api/pages/${id}`);
  return res.data;
}
