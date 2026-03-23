// Polymarket API Client with Intelligence Layer

import type { PolymarketMarket, CategoryType } from './types';
import { CATEGORY_KEYWORDS, EXCLUDED_TERMS } from './types';
import { TieredCache } from './cache';
import { ResilientExecutor, RetryExhaustedError, CircuitBreakerOpenError } from './retry';

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';

// Fallback markets when API fails
const FALLBACK_MARKETS: PolymarketMarket[] = [
  {
    id: 'fallback-1',
    title: 'Will OpenAI release GPT-5 by end of 2025?',
    slug: 'openai-gpt5-2025',
    yesPrice: 0.45,
    noPrice: 0.55,
    volume: 28000000,
    volume24h: 1500000,
    liquidity: 8200000,
    category: 'AI/Tech',
    endDate: '2025-12-31',
    url: 'https://polymarket.com/market/openai-gpt5-2025',
  },
  {
    id: 'fallback-2',
    title: 'Will Ethereum ETF see net inflows >$1B in March 2025?',
    slug: 'ethereum-etf-inflows-march-2025',
    yesPrice: 0.62,
    noPrice: 0.38,
    volume: 15000000,
    volume24h: 800000,
    liquidity: 5400000,
    category: 'Crypto',
    endDate: '2025-04-01',
    url: 'https://polymarket.com/market/ethereum-etf-inflows-march-2025',
  },
  {
    id: 'fallback-3',
    title: 'Will Fed cut rates at March 2025 FOMC meeting?',
    slug: 'fed-rate-cut-march-2025',
    yesPrice: 0.38,
    noPrice: 0.62,
    volume: 22000000,
    volume24h: 2200000,
    liquidity: 7800000,
    category: 'Macro',
    endDate: '2025-03-19',
    url: 'https://polymarket.com/market/fed-rate-cut-march-2025',
  },
  {
    id: 'fallback-4',
    title: 'Will Ukraine-Russia ceasefire be reached in 2025?',
    slug: 'ukraine-russia-ceasefire-2025',
    yesPrice: 0.28,
    noPrice: 0.72,
    volume: 18000000,
    volume24h: 900000,
    liquidity: 6200000,
    category: 'Geopolitics',
    endDate: '2026-01-01',
    url: 'https://polymarket.com/market/ukraine-russia-ceasefire-2025',
  },
  {
    id: 'fallback-5',
    title: 'Will FDA approve major Alzheimer drug in 2025?',
    slug: 'fda-alzheimer-approval-2025',
    yesPrice: 0.55,
    noPrice: 0.45,
    volume: 12000000,
    volume24h: 600000,
    liquidity: 4100000,
    category: 'Biotech',
    endDate: '2025-12-31',
    url: 'https://polymarket.com/market/fda-alzheimer-approval-2025',
  },
  {
    id: 'fallback-6',
    title: 'Will Bitcoin reach $150K in 2025?',
    slug: 'bitcoin-150k-2025',
    yesPrice: 0.42,
    noPrice: 0.58,
    volume: 35000000,
    volume24h: 3500000,
    liquidity: 11500000,
    category: 'Crypto',
    endDate: '2025-12-31',
    url: 'https://polymarket.com/market/bitcoin-150k-2025',
  },
  {
    id: 'fallback-7',
    title: 'Will oil prices exceed $100/barrel in Q2 2025?',
    slug: 'oil-price-100-q2-2025',
    yesPrice: 0.35,
    noPrice: 0.65,
    volume: 9500000,
    volume24h: 480000,
    liquidity: 3400000,
    category: 'Commodities',
    endDate: '2025-06-30',
    url: 'https://polymarket.com/market/oil-price-100-q2-2025',
  },
  {
    id: 'fallback-8',
    title: 'Will Israel-Gaza conflict expand to new front in 2025?',
    slug: 'israel-gaza-expand-2025',
    yesPrice: 0.48,
    noPrice: 0.52,
    volume: 14000000,
    volume24h: 700000,
    liquidity: 4800000,
    category: 'Geopolitics',
    endDate: '2026-01-01',
    url: 'https://polymarket.com/market/israel-gaza-expand-2025',
  },
];

export class PolymarketIntelligenceClient {
  private cache: TieredCache<PolymarketMarket[]>;
  private executor: ResilientExecutor;
  private inflightRequests: Map<string, Promise<PolymarketMarket[]>> = new Map();

  constructor() {
    this.cache = new TieredCache<PolymarketMarket[]>(30000, 300000); // 30s / 5min
    this.executor = new ResilientExecutor(
      { maxAttempts: 5, baseDelay: 1000, timeout: 8000 },
      { failureThreshold: 10, resetTimeout: 30000 }
    );
  }

  // Main fetch method with deduplication
  async fetchMarkets(): Promise<PolymarketMarket[]> {
    const cacheKey = 'polymarket_markets';
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('[Polymarket] Returning cached markets');
      return cached;
    }

    // Check for inflight request
    const inflight = this.inflightRequests.get(cacheKey);
    if (inflight) {
      console.log('[Polymarket] Returning inflight request');
      return inflight;
    }

    // Create new request
    const request = this.fetchWithResilience(cacheKey);
    this.inflightRequests.set(cacheKey, request);

    try {
      const markets = await request;
      return markets;
    } finally {
      this.inflightRequests.delete(cacheKey);
    }
  }

  private async fetchWithResilience(cacheKey: string): Promise<PolymarketMarket[]> {
    try {
      const markets = await this.executor.execute(async () => {
        const response = await fetch(
          `${GAMMA_API_BASE}/markets?active=true&closed=false&liquidityMin=100000&limit=200`,
          {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(8000),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP_${response.status}`);
        }

        const data = await response.json();
        return this.parseMarkets(data);
      });

      // Filter markets
      const filtered = this.filterMarkets(markets);
      
      // Categorize markets
      const categorized = this.categorizeMarkets(filtered);
      
      // Cache the results
      this.cache.set(cacheKey, categorized);
      
      console.log(`[Polymarket] Fetched ${markets.length}, filtered to ${categorized.length} markets`);
      
      return categorized;

    } catch (error) {
      console.error('[Polymarket] Fetch failed, using fallback:', error);
      
      // Return fallback markets on error
      return FALLBACK_MARKETS;
    }
  }

  private parseMarkets(data: unknown[]): PolymarketMarket[] {
    if (!Array.isArray(data)) {
      console.warn('[Polymarket] Invalid response format');
      return [];
    }

    return data.map((row: any) => {
      // Parse outcome prices
      let yesPrice = 0.5;
      let noPrice = 0.5;
      
      if (row.outcomePrices) {
        try {
          const prices = JSON.parse(row.outcomePrices);
          if (Array.isArray(prices) && prices.length >= 2) {
            yesPrice = Number(prices[0]) || 0.5;
            noPrice = Number(prices[1]) || 0.5;
          }
        } catch {
          // Use defaults
        }
      } else if (row.yesPrice != null) {
        yesPrice = Number(row.yesPrice) || 0.5;
        noPrice = row.noPrice != null ? Number(row.noPrice) : 1 - yesPrice;
      }

      return {
        id: String(row.id || row.conditionId || `${Date.now()}-${Math.random()}`),
        title: String(row.question || row.title || 'Unknown Market'),
        slug: row.slug,
        description: row.description,
        yesPrice: Math.max(0, Math.min(1, yesPrice)),
        noPrice: Math.max(0, Math.min(1, noPrice)),
        volume: Number(row.volume || row.volumeNum || 0),
        volume24h: Number(row.volume24hr || row.volume24h || 0),
        liquidity: Number(row.liquidity || row.liquidityNum || 0),
        bestBid: row.bestBid ? Number(row.bestBid) : undefined,
        bestAsk: row.bestAsk ? Number(row.bestAsk) : undefined,
        midPrice: row.midPrice ? Number(row.midPrice) : (yesPrice + noPrice) / 2,
        endDate: row.endDate || row.expirationDate,
        createdAt: row.createdAt,
        url: row.slug ? `https://polymarket.com/market/${row.slug}` : undefined,
        icon: row.icon,
      };
    });
  }

  // Filter out elections, sports, entertainment, 2024 markets
  private filterMarkets(markets: PolymarketMarket[]): PolymarketMarket[] {
    return markets.filter(market => {
      const text = `${market.title} ${market.description || ''}`.toLowerCase();
      
      // Skip 2024 markets
      if (text.includes('2024')) {
        return false;
      }
      
      // Skip excluded terms (elections, sports, entertainment)
      if (EXCLUDED_TERMS.some(term => text.includes(term.toLowerCase()))) {
        return false;
      }
      
      // Must match at least one category
      const hasCategory = Object.values(CATEGORY_KEYWORDS).some(keywords =>
        keywords.some(kw => text.includes(kw.toLowerCase()))
      );
      
      return hasCategory;
    });
  }

  // Assign category to each market
  private categorizeMarkets(markets: PolymarketMarket[]): PolymarketMarket[] {
    return markets.map(market => {
      const text = `${market.title} ${market.description || ''}`.toLowerCase();
      
      // Find best matching category
      let bestCategory: CategoryType | undefined;
      let bestMatches = 0;
      
      for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        const matches = keywords.filter(kw => text.includes(kw.toLowerCase())).length;
        if (matches > bestMatches) {
          bestMatches = matches;
          bestCategory = category as CategoryType;
        }
      }
      
      return {
        ...market,
        category: bestCategory || 'Macro',
      };
    });
  }

  // Force refresh
  async refresh(): Promise<PolymarketMarket[]> {
    this.cache.delete('polymarket_markets');
    return this.fetchMarkets();
  }

  // Get cache stats
  getCacheStats() {
    return this.cache.getStats();
  }

  // Get executor stats
  getExecutorStats() {
    return this.executor.getStats();
  }

  // Clear everything
  clear(): void {
    this.cache.clear();
    this.inflightRequests.clear();
    this.executor.reset();
  }
}

// Singleton instance
let client: PolymarketIntelligenceClient | null = null;

export function getPolymarketClient(): PolymarketIntelligenceClient {
  if (!client) {
    client = new PolymarketIntelligenceClient();
  }
  return client;
}

export function resetPolymarketClient(): void {
  client?.clear();
  client = null;
}

// Export fallbacks for testing
export { FALLBACK_MARKETS };
