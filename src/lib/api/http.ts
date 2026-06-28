/**
 * Shared HTTP utilities for external API clients.
 * Provides rate limiting, auth headers, and graceful error handling.
 */

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly source: string,
    public readonly status?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type RateLimitState = { tokens: number; lastRefill: number };

const rateLimits = new Map<string, RateLimitState>();

/** Simple token-bucket rate limiter per source key. */
async function throttle(key: string, maxPerMinute: number): Promise<void> {
  const now = Date.now();
  const state = rateLimits.get(key) ?? { tokens: maxPerMinute, lastRefill: now };
  const elapsed = now - state.lastRefill;
  if (elapsed >= 60_000) {
    state.tokens = maxPerMinute;
    state.lastRefill = now;
  }
  if (state.tokens <= 0) {
    const wait = 60_000 - elapsed;
    await new Promise((r) => setTimeout(r, Math.min(wait, 5000)));
    state.tokens = maxPerMinute;
    state.lastRefill = Date.now();
  }
  state.tokens -= 1;
  rateLimits.set(key, state);
}

export type ApiFetchOptions = {
  source: string;
  baseUrl: string;
  path: string;
  apiKey?: string;
  apiKeyHeader?: string;
  apiKeyQuery?: string;
  rateLimitPerMinute?: number;
  cache?: RequestCache;
  signal?: AbortSignal;
};

/**
 * Fetch JSON from an external API with rate limiting and error handling.
 * Returns null on failure (graceful degradation) unless throwOnError is set.
 */
export async function apiFetch<T>(
  opts: ApiFetchOptions & { throwOnError?: false },
): Promise<T | null>;
export async function apiFetch<T>(
  opts: ApiFetchOptions & { throwOnError: true },
): Promise<T>;
export async function apiFetch<T>(
  opts: ApiFetchOptions & { throwOnError?: boolean },
): Promise<T | null> {
  const {
    source,
    baseUrl,
    path,
    apiKey,
    apiKeyHeader = 'X-API-Key',
    apiKeyQuery,
    rateLimitPerMinute = 60,
    cache = 'no-store',
    signal,
    throwOnError = false,
  } = opts;

  try {
    await throttle(source, rateLimitPerMinute);

    let url = `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    if (apiKey && apiKeyQuery) {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}${apiKeyQuery}=${encodeURIComponent(apiKey)}`;
    }

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (apiKey && !apiKeyQuery) headers[apiKeyHeader] = apiKey;

    const res = await fetch(url, { cache, headers, signal });
    if (!res.ok) {
      throw new ApiClientError(`${source} HTTP ${res.status}`, source, res.status);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (throwOnError) throw err;
    console.warn(`[${source}] fetch failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/** Reset rate limit state (for tests). */
export function resetRateLimits(): void {
  rateLimits.clear();
}
