import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

@Injectable()
export class LruCacheService {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;

  constructor(private readonly config: ConfigService) {
    this.maxEntries = this.parseNumber(
      this.config.get<string>('LRU_CACHE_MAX'),
      500,
    );
    this.defaultTtlMs = this.parseNumber(
      this.config.get<string>('LRU_CACHE_TTL_MS'),
      60_000,
    );
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    this.store.delete(key);
    this.store.set(key, entry);

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs = this.defaultTtlMs): T {
    const normalizedTtl = this.normalizeTtl(ttlMs);

    this.store.delete(key);
    this.store.set(key, {
      value,
      expiresAt: Date.now() + normalizedTtl,
    });

    this.evictExpired();
    this.evictOverflow();

    return value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  deleteByPrefix(prefix: string): number {
    let deleted = 0;

    for (const key of this.store.keys()) {
      if (!key.startsWith(prefix)) {
        continue;
      }

      this.store.delete(key);
      deleted += 1;
    }

    return deleted;
  }

  clear(): void {
    this.store.clear();
    this.inFlight.clear();
  }

  getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs?: number,
  ): Promise<T>;
  getOrSet<T>(key: string, factory: () => T, ttlMs?: number): T;
  getOrSet<T>(key: string, factory: () => T | Promise<T>, ttlMs?: number) {
    const cached = this.get<T>(key);

    if (cached !== undefined) {
      console.log(`Cache hit for key: ${key}`);
      return cached;
    }

    const pending = this.inFlight.get(key);

    if (pending) {
      return pending as Promise<T>;
    }

    const created = factory();

    if (created instanceof Promise) {
      const pendingPromise = created
        .then((value) => this.set(key, value, ttlMs))
        .finally(() => this.inFlight.delete(key));

      this.inFlight.set(key, pendingPromise);
      return pendingPromise;
    }

    return this.set(key, created, ttlMs);
  }

  private evictExpired() {
    const now = Date.now();

    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  private evictOverflow() {
    while (this.store.size > this.maxEntries) {
      const oldestKey = this.store.keys().next().value;

      if (!oldestKey) {
        return;
      }

      this.store.delete(oldestKey);
    }
  }

  private normalizeTtl(ttlMs: number) {
    return ttlMs > 0 ? ttlMs : this.defaultTtlMs;
  }

  private parseNumber(raw: string | undefined, fallback: number) {
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}
