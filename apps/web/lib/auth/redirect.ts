const SAFE_REDIRECT_ORIGIN = "https://kb.local";

/**
 * Keeps post-auth redirects inside this application. Using URL parsing also
 * rejects backslash-based protocol-relative URLs such as `/\\evil.example`.
 */
export function safeRedirectPath(value: unknown, fallback = "/admin"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(value, SAFE_REDIRECT_ORIGIN);
    if (url.origin !== SAFE_REDIRECT_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
