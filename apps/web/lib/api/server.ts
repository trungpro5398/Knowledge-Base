import { cache } from "react";
import { apiClient } from "./client";

const serverGetCached = cache(
  async (path: string, token: string, cacheMode: RequestCache | undefined) => {
    const init: { method: "GET"; token: string; cache?: RequestCache } = {
      method: "GET",
      token,
    };
    if (cacheMode !== undefined) {
      init.cache = cacheMode;
    }
    return apiClient(path, init);
  }
);

export async function serverApiGet<T>(
  path: string,
  token: string,
  options?: { cache?: RequestCache }
): Promise<T> {
  return serverGetCached(path, token, options?.cache) as Promise<T>;
}
