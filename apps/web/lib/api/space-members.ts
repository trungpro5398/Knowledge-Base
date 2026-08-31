import type { Member } from "@/components/spaces/MembersList";
import { serverApiGet } from "./server";
import type { ApiResponse } from "./types";

export async function getSpaceMembers(
  spaceId: string,
  token: string
): Promise<Member[] | null> {
  try {
    const response = await serverApiGet<ApiResponse<Member[]>>(
      `/api/spaces/${spaceId}/members`,
      token
    );
    return response.data;
  } catch {
    return null;
  }
}
