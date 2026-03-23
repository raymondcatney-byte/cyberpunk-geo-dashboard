// Tiered Caching System - L1: Memory, L2: localStorage

import type { CacheEntry, CacheStats } from './types';

class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, hitRate: 0 };

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      this.stats.size = this.cache.size;
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    return entry.data;
  }

  set(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    this.stats.size = this.cache.size;
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.stats.size = this.cache.size;
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, size: 0, hitRate: 0 };
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
    this.stats.size = this.cache.size;
  }
}

class LocalStorageCache<T> {
  private prefix = 'pm_intel_';
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, hitRate: 0 };

  get(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      
      if (!item) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(item);
      
      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        localStorage.removeItem(this.prefix + key);
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      this.stats.hits++;
      this.updateHitRate();
      return entry.data;
    } catch {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  set(key: string, data: T, ttl: number): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(entry));
      this.stats.size = this.getSize();
    } catch (e) {
      // localStorage full, clear old entries
      this.clearOldEntries();
      // Try again
      try {
        const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
        localStorage.setItem(this.prefix + key, JSON.stringify(entry));
      } catch {
        // Still failing, skip
      }
    }
  }

  delete(key: string): void {
    localStorage.removeItem(this.prefix + key);
    this.stats.size = this.getSize();
  }

  clear(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    this.stats = { hits: 0, misses: 0, size: 0, hitRate: 0 };
  }

  getStats(): CacheStats {
    return { ...this.stats, size: this.getSize() };
  }

  private getSize(): number {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) count++;
    }
    return count;
  }

  private clearOldEntries(): void {
    const entries: { key: string; age: number }[] = [];
    const now = Date.now();
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const entry: CacheEntry<T> = JSON.parse(item);
            entries.push({ key, age: now - entry.timestamp });
          }
        } catch {
          // Invalid entry, remove it
          localStorage.removeItem(key);
        }
      }
    }
    
    // Remove oldest 20% of entries
    entries.sort((a, b) => b.age - a.age);
    const toRemove = Math.ceil(entries.length * 0.2);
    entries.slice(0, toRemove).forEach(e => localStorage.removeItem(e.key));
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

// Tiered Cache Manager
export class TieredCache<T> {
  private l1: MemoryCache<T>;      // Memory
  private l2: LocalStorageCache<T>; // localStorage
  
  // TTLs in milliseconds
  private l1TTL: number;
  private l2TTL: number;

  constructor(l1TTL = 30000, l2TTL = 300000) {
    this.l1 = new MemoryCache<T>();
    this.l2 = new LocalStorageCache<T>();
    this.l1TTL = l1TTL;
    this.l2TTL = l2TTL;

    // Cleanup L1 every 60 seconds
    setInterval(() => this.l1.cleanup(), 60000);
  }

  get(key: string): T | null {
    // Try L1 first
    const l1Data = this.l1.get(key);
    if (l1Data !== null) {
      return l1Data;
    }

    // Try L2
    const l2Data = this.l2.get(key);
    if (l2Data !== null) {
      // Promote to L1
      this.l1.set(key, l2Data, this.l1TTL);
      return l2Data;
    }

    return null;
  }

  set(key: string, data: T): void {
    // Set in both tiers
    this.l1.set(key, data, this.l1TTL);
    this.l2.set(key, data, this.l2TTL);
  }

  delete(key: string): void {
    this.l1.delete(key);
    this.l2.delete(key);
  }

  clear(): void {
    this.l1.clear();
    this.l2.clear();
  }

  getStats(): { l1: CacheStats; l2: CacheStats } {
    return {
      l1: this.l1.getStats(),
      l2: this.l2.getStats()
    };
  }

  // Stale-while-revalidate pattern
  async getOrFetch(
    key: string, 
    fetchFn: () => Promise<T>, 
    options?: { allowStale?: boolean }
  ): Promise<T> {
    const cached = this.get(key);
    
    if (cached !== null) {
      // Return cached immediately
      if (options?.allowStale) {
        // Trigger background refresh
        this.backgroundRefresh(key, fetchFn);
      }
      return cached;
    }

    // Fetch fresh data
    const fresh = await fetchFn();
    this.set(key, fresh);
    return fresh;
  }

  private async backgroundRefresh(key: string, fetchFn: () => Promise<T>): Promise<void> {
    try {
      const fresh = await fetchFn();
      this.set(key, fresh);
    } catch (e) {
      // Silent fail for background refresh
      console.warn(`[Cache] Background refresh failed for ${key}:`, e);
    }
  }
}

// Singleton instance
let globalCache: TieredCache<unknown> | null = null;

export function getGlobalCache(): TieredCache<unknown> {
  if (!globalCache) {
    globalCache = new TieredCache(30000, 300000); // 30s L1, 5min L2
  }
  return globalCache;
}

export function clearGlobalCache(): void {
  globalCache?.clear();
}
