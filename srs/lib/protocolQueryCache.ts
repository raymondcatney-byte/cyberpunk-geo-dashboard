/**
 * Protocol Query Cache
 * Caches API responses for Protocol tab queries to reduce redundant calls
 * Uses memory cache with localStorage persistence for last-good-data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  query: string;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  persistToStorage?: boolean;
  storageKey?: string;
}

class QueryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    if (config.persistToStorage && config.storageKey) {
      this.loadFromStorage();
    }
  }

  private getKey(query: string): string {
    // Simple hash of query string
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `${query.slice(0, 50)}_${hash}`;
  }

  get(query: string): T | null {
    const key = this.getKey(query);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    const isExpired = Date.now() - entry.timestamp > this.config.ttl;
    
    if (isExpired) {
      // Return stale data while triggering revalidation in background
      return entry.data;
    }
    
    return entry.data;
  }

  isStale(query: string): boolean {
    const key = this.getKey(query);
    const entry = this.cache.get(key);
    if (!entry) return true;
    return Date.now() - entry.timestamp > this.config.ttl;
  }

  set(query: string, data: T): void {
    const key = this.getKey(query);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      query,
    };
    
    this.cache.set(key, entry);
    
    if (this.config.persistToStorage && this.config.storageKey) {
      this.saveToStorage();
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.config.storageKey!);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only load entries less than 24 hours old
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        Object.entries(parsed).forEach(([key, entry]: [string, any]) => {
          if (entry.timestamp > cutoff) {
            this.cache.set(key, entry);
          }
        });
      }
    } catch (e) {
      console.warn('Failed to load cache from storage:', e);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const data = Object.fromEntries(this.cache.entries());
      localStorage.setItem(this.config.storageKey!, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save cache to storage:', e);
    }
  }

  clear(): void {
    this.cache.clear();
    if (this.config.persistToStorage && this.config.storageKey) {
      localStorage.removeItem(this.config.storageKey);
    }
  }
}

// Export singleton instances for different cache types
export const watchtowerCache = new QueryCache<any[]>({
  ttl: 5 * 60 * 1000, // 5 minutes
  persistToStorage: true,
  storageKey: 'protocol_watchtower_cache',
});

export const pubmedCache = new QueryCache<any[]>({
  ttl: 5 * 60 * 1000, // 5 minutes
  persistToStorage: true,
  storageKey: 'protocol_pubmed_cache',
});

export const consultantCache = new QueryCache<string>({
  ttl: 30 * 1000, // 30 seconds (more dynamic)
  persistToStorage: false,
});

export default QueryCache;
