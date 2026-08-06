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

  // Handle cache option
  const fetchOptions: RequestInit = {
    ...init,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  // If cache option is provided, use it; otherwise default to no-store for server-side
  if ('cache' in init) {
    fetchOptions.cache = init.cache;
  } else if (typeof window === 'undefined') {
    // Server-side: disable cache by default
    fetchOptions.cache = 'no-store';
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, fetchOptions);
  } catch {
    throw new ApiError(
      "Không thể kết nối máy chủ. Kiểm tra kết nối mạng rồi thử lại.",
      0
    );
  }

  // Handle empty responses (204 No Content)
  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMessage =
      (data as { message?: string }).message ||
      (res.status === 401
        ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
        : res.status === 403
          ? "Bạn không có quyền thực hiện thao tác này."
          : res.status >= 500
            ? "Máy chủ đang gặp sự cố. Vui lòng thử lại sau."
            : res.statusText || "Không thể hoàn tất thao tác.");
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
