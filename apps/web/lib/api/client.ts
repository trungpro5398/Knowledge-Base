const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").trim();

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: unknown[]
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiClientOptions extends Omit<RequestInit, "body"> {
  token?: string | null;
  body?: unknown;
}

export async function apiClient<T = unknown>(
  path: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const { token, body, ...init } = options;
  const headers = new Headers(init.headers);

  // Get access token - from param or from session
  const accessToken =
    token ??
    (typeof window !== "undefined"
      ? await (await import("./auth")).getAccessToken()
      : null);

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  // Set content type for JSON body
  if (body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Handle empty responses (204 No Content)
  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMessage =
      (data as { message?: string }).message ||
      res.statusText ||
      "Request failed";
    const errors = (data as { errors?: unknown[] }).errors;
    throw new ApiError(errorMessage, res.status, errors);
  }

  return data as T;
}

// Convenience methods
export const api = {
  get: <T = unknown>(path: string, options?: ApiClientOptions) =>
    apiClient<T>(path, { ...options, method: "GET" }),

  post: <T = unknown>(path: string, body?: unknown, options?: ApiClientOptions) =>
    apiClient<T>(path, { ...options, method: "POST", body }),

  patch: <T = unknown>(path: string, body?: unknown, options?: ApiClientOptions) =>
    apiClient<T>(path, { ...options, method: "PATCH", body }),

  put: <T = unknown>(path: string, body?: unknown, options?: ApiClientOptions) =>
    apiClient<T>(path, { ...options, method: "PUT", body }),

  delete: <T = unknown>(path: string, options?: ApiClientOptions) =>
    apiClient<T>(path, { ...options, method: "DELETE" }),
};
