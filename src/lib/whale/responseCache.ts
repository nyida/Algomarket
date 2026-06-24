const store = new Map<string, { at: number; data: unknown }>();

export function cachedResponse<T>(key: string, ttlMs: number, fn: () => T): T {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T;
  const data = fn();
  store.set(key, { at: Date.now(), data });
  return data;
}

export async function cachedResponseAsync<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T;
  const data = await fn();
  store.set(key, { at: Date.now(), data });
  return data;
}
