import { serverApiGet } from "./server";
import type { ApiResponse, PageNode, Space } from "./types";

export interface SpaceBootstrapOrganization {
  id: string;
  name: string;
  icon: string | null;
}

export interface SpaceBootstrap {
  space: Space;
  role: "viewer" | "editor" | "admin";
  tree: PageNode[];
  spaces: Space[];
  organizations: SpaceBootstrapOrganization[];
}

export async function getSpaceBootstrap(
  spaceId: string,
  token: string
): Promise<SpaceBootstrap | null> {
  try {
    const response = await serverApiGet<ApiResponse<SpaceBootstrap>>(
      `/api/spaces/${spaceId}/bootstrap`,
      token
    );
    return response.data;
  } catch {
    return null;
  }
}
