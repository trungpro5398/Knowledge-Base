/**
 * Fetch với retry logic để handle server cold start
 * Retry với exponential backoff khi gặp network errors hoặc timeout
 */

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  timeout: 30000, // 30 seconds
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true; // Network error
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("econnreset")
    );
  }
  return false;
}

function isRetryableStatus(status: number): boolean {
  // Retry on 5xx errors (server errors) và 408 (timeout)
  return status >= 500 || status === 408;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const opts = { ...DEFAULT_OPTIONS, ...retryOptions };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Tạo AbortController cho timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Nếu response OK hoặc không retryable, return ngay
        if (response.ok || !isRetryableStatus(response.status)) {
          return response;
        }

        // Nếu là retryable status và chưa hết retries, tiếp tục retry
        if (attempt < opts.maxRetries) {
          const delayMs = Math.min(
            opts.initialDelay * Math.pow(2, attempt),
            opts.maxDelay
          );
          await delay(delayMs);
          continue;
        }

        // Hết retries, return response
        return response;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Nếu không phải retryable error hoặc đã hết retries, throw
      if (!isRetryableError(error) || attempt >= opts.maxRetries) {
        throw lastError;
      }

      // Tính delay với exponential backoff
      const delayMs = Math.min(
        opts.initialDelay * Math.pow(2, attempt),
        opts.maxDelay
      );
      await delay(delayMs);
    }
  }

  throw lastError || new Error("Failed to fetch after retries");
}
