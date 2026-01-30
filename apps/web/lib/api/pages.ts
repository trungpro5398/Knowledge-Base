import { apiClient } from "./client";

export async function getPagesTree(spaceId: string) {
  const res = await apiClient(`/api/spaces/${spaceId}/pages/tree`);
  return res.data;
}

export async function getPage(id: string) {
  const res = await apiClient(`/api/pages/${id}`);
  return res.data;
}
