type Entry<T> = {
  savedAt: number;
  payload: T;
};

const memory = new Map<string, Entry<unknown>>();

function readEntry<T>(key: string): Entry<T> | null {
  const cached = memory.get(key) as Entry<T> | undefined;
  if (cached) return cached;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry<T>;
    if (typeof parsed?.savedAt !== 'number' || !('payload' in parsed)) return null;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function readCache<T>(key: string, maxAgeMs: number, now = Date.now()): T | null {
  const entry = readEntry<T>(key);
  if (!entry) return null;
  if (now - entry.savedAt > maxAgeMs) return null;
  return entry.payload;
}

export function writeCache<T>(key: string, payload: T, now = Date.now()): void {
  const entry: Entry<T> = { savedAt: now, payload };
  memory.set(key, entry);
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Private mode and a full disk still leave the in-memory copy.
  }
}

export function clearMarketMemory(): void {
  memory.clear();
}
