// Deferred-action queue. Subcommands can enqueue ("after this run is
// done, also do X") and a top-level driver flushes the queue at exit.
//
// Used by `pantry add` to enqueue an event-log append after a successful
// store update, so a partial write doesn't leave a misleading log entry.

export type Action = () => Promise<void>;

const queue: Action[] = [];

export function enqueue(fn: Action): void {
  queue.push(fn);
}

export function size(): number {
  return queue.length;
}

export function clear(): void {
  queue.length = 0;
}

export interface FlushResult {
  ran: number;
  failed: number;
  errors: Error[];
}

export async function flush(): Promise<FlushResult> {
  const result: FlushResult = { ran: 0, failed: 0, errors: [] };
  while (queue.length > 0) {
    const fn = queue.shift()!;
    try {
      await fn();
      result.ran++;
    } catch (err) {
      result.failed++;
      result.errors.push(err as Error);
    }
  }
  return result;
}

export function pending(): readonly Action[] {
  return [...queue];
}

/** Enqueue and immediately flush (for tests). */
export async function runImmediately(fn: Action): Promise<void> {
  enqueue(fn);
  const r = await flush();
  if (r.errors.length > 0) throw r.errors[0];
}
