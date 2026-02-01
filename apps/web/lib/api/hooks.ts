"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { ApiResponse, Space, PageNode, Page, PageVersion } from "./types";

export function useSpaces() {
  return useQuery({
    queryKey: ["spaces"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Space[]>>("/api/spaces");
      return res.data;
    },
  });
}

export function usePagesTree(spaceId: string, enabled = true) {
  return useQuery({
    queryKey: ["pages", "tree", spaceId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PageNode[]>>(`/api/spaces/${spaceId}/pages/tree`);
      return res.data;
    },
    enabled: enabled && !!spaceId,
  });
}

export function usePage(pageId: string, enabled = true) {
  return useQuery({
    queryKey: ["pages", pageId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Page>>(`/api/pages/${pageId}`);
      return res.data;
    },
    enabled: enabled && !!pageId,
  });
}

export function useUpdatePage(pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title?: string; slug?: string; parent_id?: string | null }) => {
      return api.patch<ApiResponse<Page>>(`/api/pages/${pageId}`, data);
    },
    onSuccess: (_, __, ___) => {
      queryClient.invalidateQueries({ queryKey: ["pages", pageId] });
      queryClient.invalidateQueries({ queryKey: ["pages", "tree"] });
    },
  });
}

export function useCreateVersion(pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { content_md?: string; summary?: string }) => {
      return api.post<ApiResponse<PageVersion>>(`/api/pages/${pageId}/versions`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages", pageId] });
    },
  });
}

export function usePublishPage(pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string) => {
      const res = await api.post<ApiResponse<Page>>(`/api/pages/${pageId}/publish`, {
        version_id: versionId,
      });
      return res;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["pages", pageId] });
      if (res?.data?.space_id) {
        queryClient.invalidateQueries({ queryKey: ["pages", "tree", res.data.space_id] });
      }
    },
  });
}
