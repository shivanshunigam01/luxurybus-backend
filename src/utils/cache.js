/** Simple in-process TTL cache for hot public/read endpoints. */
const store = new Map();

export const cacheGet = (key) => {
  const row = store.get(key);
  if (!row) return undefined;
  if (row.expiresAt && Date.now() > row.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return row.value;
};

export const cacheSet = (key, value, ttlMs = 60_000) => {
  store.set(key, { value, expiresAt: ttlMs > 0 ? Date.now() + ttlMs : null });
  return value;
};

export const cacheDel = (key) => store.delete(key);

export const cacheDelPrefix = (prefix) => {
  for (const k of store.keys()) {
    if (String(k).startsWith(prefix)) store.delete(k);
  }
};

export const cached = async (key, ttlMs, fn) => {
  const hit = cacheGet(key);
  if (hit !== undefined) return hit;
  const value = await fn();
  return cacheSet(key, value, ttlMs);
};
