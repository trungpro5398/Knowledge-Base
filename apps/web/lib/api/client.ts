const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function apiClient(
  path: string,
  options: RequestInit & { token?: string | null } = {}
) {
  const { token, ...init } = options;
  const headers = new Headers(init.headers);
  const accessToken = token ?? (typeof window !== "undefined" ? await (await import("./auth")).getAccessToken() : null);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || res.statusText);
  }
  return res.json();
}
