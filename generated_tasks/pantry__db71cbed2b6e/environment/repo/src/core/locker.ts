// In-process serialised mutex. Multiple async callers can request
// `lock(key)` and only one runs at a time per key.

const queues = new Map<string, Promise<void>>();

export async function lock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (!key) throw new Error("locker: key required");
  const prev = queues.get(key) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const next = new Promise<void>((r) => { release = r; });
  queues.set(key, prev.then(() => next));
  try {
    await prev;
    return await fn();
  } finally {
    release();
    if (queues.get(key) === next.then(() => undefined)) {
      queues.delete(key);
    }
  }
}

export function isLocked(key: string): boolean {
  return queues.has(key);
}

export function clearAll(): void {
  queues.clear();
}

export function activeKeys(): string[] {
  return [...queues.keys()].sort();
}
