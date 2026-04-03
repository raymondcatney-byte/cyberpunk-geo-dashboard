/**
 * CLOB API Client
 * Polymarket CLOB (Central Limit Order Book) API integration
 * https://docs.polymarket.com/api-reference/clob/rest-api
 */

import type { 
  ClobMarket, 
  ClobPrice, 
  OrderBook, 
  BatchPriceResponse,
  OrderBookLevel 
} from '../types/polymarket.js';

const CLOB_BASE = 'https://clob.polymarket.com';

// Rate limiter: CLOB allows ~100 requests per minute
class RateLimiter {
  private tokens: number = 100;
  private lastRefill: number = Date.now();
  private maxTokens: number = 100;
  private refillRate: number = 100 / 60; // tokens per second (100 per minute)
  private queue: Array<{
    execute: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }> = [];
  private processing: boolean = false;

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      this.refill();

      if (this.tokens < 1) {
        // Wait for tokens to refill
        const waitTime = (1 - this.tokens) / this.refillRate * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      const request = this.queue.shift();
      if (!request) continue;

      this.tokens--;
      
      try {
        const result = await request.execute();
        request.resolve(result);
      } catch (error) {
        request.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.processing = false;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        execute: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject
      });
      this.processQueue();
    });
  }
}

const rateLimiter = new RateLimiter();

// Helper for fetch with timeout
async function fetchWithTimeout(
  url: string, 
  options: RequestInit = {}, 
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Get batch prices for multiple markets
 * CLOB API: GET /prices?condition_id=xxx&condition_id=yyy
 */
export async function getBatchPrices(conditionIds: string[]): Promise<Map<string, ClobPrice>> {
  if (conditionIds.length === 0) {
    return new Map();
  }

  return rateLimiter.execute(async () => {
    const queryParams = conditionIds.map(id => `condition_id=${encodeURIComponent(id)}`).join('&');
    const url = `${CLOB_BASE}/prices?${queryParams}`;
    
    const response = await fetchWithTimeout(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`CLOB prices API error: ${response.status}`);
    }

    const data: BatchPriceResponse = await response.json();
    const prices = new Map<string, ClobPrice>();

    for (const [conditionId, outcomes] of Object.entries(data)) {
      for (const [outcome, priceStr] of Object.entries(outcomes)) {
        const price = parseFloat(priceStr);
        if (!isNaN(price)) {
          prices.set(`${conditionId}_${outcome}`, {
            conditionId,
            assetId: '', // Will be populated from market data
            outcome,
            price,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return prices;
  });
}

/**
 * Get order book for specific asset IDs
 * CLOB API: POST /books with body { asset_ids: [...] }
 */
export async function getOrderBook(assetIds: string[]): Promise<Map<string, OrderBook>> {
  if (assetIds.length === 0) {
    return new Map();
  }

  return rateLimiter.execute(async () => {
    const url = `${CLOB_BASE}/books`;
    
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ asset_ids: assetIds })
    });

    if (!response.ok) {
      throw new Error(`CLOB books API error: ${response.status}`);
    }

    const data: Record<string, { bids: OrderBookLevel[]; asks: OrderBookLevel[] }> = await response.json();
    const orderBooks = new Map<string, OrderBook>();

    for (const [assetId, book] of Object.entries(data)) {
      orderBooks.set(assetId, {
        market: assetId,
        assetId,
        bids: book.bids || [],
        asks: book.asks || [],
        timestamp: new Date().toISOString()
      });
    }

    return orderBooks;
  });
}

/**
 * Get single market details from CLOB
 * CLOB API: GET /markets/{conditionId}
 */
export async function getMarket(conditionId: string): Promise<ClobMarket | null> {
  return rateLimiter.execute(async () => {
    const url = `${CLOB_BASE}/markets/${encodeURIComponent(conditionId)}`;
    
    const response = await fetchWithTimeout(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`CLOB market API error: ${response.status}`);
    }

    const data: ClobMarket = await response.json();
    return data;
  });
}

/**
 * Get multiple markets from CLOB
 * Uses /markets endpoint with filtering
 */
export async function getMarkets(options: {
  active?: boolean;
  closed?: boolean;
  limit?: number;
} = {}): Promise<ClobMarket[]> {
  return rateLimiter.execute(async () => {
    const params = new URLSearchParams();
    if (options.active !== undefined) params.set('active', String(options.active));
    if (options.closed !== undefined) params.set('closed', String(options.closed));
    if (options.limit) params.set('limit', String(options.limit));

    const url = `${CLOB_BASE}/markets?${params.toString()}`;
    
    const response = await fetchWithTimeout(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`CLOB markets API error: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.markets || [];
  });
}

/**
 * Get best bid/ask for a market
 * Extracts from order book
 */
export async function getBestBidAsk(conditionId: string, tokenId: string): Promise<{ bestBid: number | null; bestAsk: number | null }> {
  try {
    const orderBooks = await getOrderBook([tokenId]);
    const book = orderBooks.get(tokenId);
    
    if (!book) {
      return { bestBid: null, bestAsk: null };
    }

    const bestBid = book.bids.length > 0 ? parseFloat(book.bids[0].price) : null;
    const bestAsk = book.asks.length > 0 ? parseFloat(book.asks[0].price) : null;

    return { bestBid, bestAsk };
  } catch (error) {
    console.error(`Failed to get best bid/ask for ${conditionId}:`, error);
    return { bestBid: null, bestAsk: null };
  }
}

/**
 * Enrich Gamma markets with CLOB prices
 */
export async function enrichMarketsWithClobPrices(
  markets: { conditionId: string; outcome?: string }[]
): Promise<Map<string, { price: number; bestBid: number | null; bestAsk: number | null }>> {
  const conditionIds = [...new Set(markets.map(m => m.conditionId))];
  
  try {
    const priceMap = await getBatchPrices(conditionIds);
    const result = new Map<string, { price: number; bestBid: number | null; bestAsk: number | null }>();

    for (const market of markets) {
      const key = `${market.conditionId}_${market.outcome || 'Yes'}`;
      const price = priceMap.get(key);
      
      if (price) {
        result.set(market.conditionId, {
          price: price.price,
          bestBid: price.bestBid || null,
          bestAsk: price.bestAsk || null
        });
      }
    }

    return result;
  } catch (error) {
    console.error('Failed to enrich markets with CLOB prices:', error);
    return new Map();
  }
}

export { rateLimiter };
