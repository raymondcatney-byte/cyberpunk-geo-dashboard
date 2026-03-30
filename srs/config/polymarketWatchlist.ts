export interface WatchlistMarket {
  slug: string;
  category: string;
  displayName: string;
}

export const POLYMARKET_WATCHLIST: WatchlistMarket[] = [
  { slug: 'will-gold-gc-hit-by-end-of-march', category: 'commodities', displayName: 'Gold GC hit end of March' },
  { slug: 'what-will-gold-gc-settle-at-in-march', category: 'commodities', displayName: 'Gold GC settle March' },
  { slug: 'gold-gc-above-end-of-march', category: 'commodities', displayName: 'Gold GC above end March' },
  { slug: 'gc-hit-jun-2026', category: 'commodities', displayName: 'Gold GC hit June 2026' },
  { slug: 'gc-settle-jun-2026', category: 'commodities', displayName: 'Gold GC settle June 2026' },
  { slug: 'will-crude-oil-cl-hit-by-end-of-march', category: 'commodities', displayName: 'Oil CL hit end March' },
  { slug: 'what-will-crude-oil-cl-settle-at-in-march', category: 'commodities', displayName: 'Oil CL settle March' },
  { slug: 'crude-oil-cl-above-end-of-march', category: 'commodities', displayName: 'Oil CL above end March' },
  { slug: 'cl-hit-jun-2026', category: 'commodities', displayName: 'Oil CL hit June 2026' },
  { slug: 'fda-approves-retatrutide-this-year', category: 'biotech', displayName: 'FDA Retatrutide' },
  { slug: 'new-coronavirus-pandemic-in-2026', category: 'science', displayName: 'New Pandemic 2026' },
  { slug: 'netanyahu-out-before-2027', category: 'geopolitics', displayName: 'Netanyahu out 2027' },
  { slug: 'us-forces-enter-iran-by', category: 'geopolitics', displayName: 'US forces Iran' },
  { slug: 'us-x-iran-ceasefire-by', category: 'geopolitics', displayName: 'US Iran ceasefire' },
  { slug: 'will-the-iranian-regime-fall-by-march-31', category: 'geopolitics', displayName: 'Iran regime fall March' },
  { slug: 'will-china-invade-taiwan-by-march-31-2026', category: 'geopolitics', displayName: 'China Taiwan March' },
  { slug: 'fed-decision-in-april', category: 'economy', displayName: 'Fed April' },
  { slug: 'how-many-fed-rate-cuts-in-2026', category: 'economy', displayName: 'Fed rate cuts 2026' },
  { slug: 'what-price-will-bitcoin-hit-in-march-2026', category: 'crypto', displayName: 'BTC March 2026' },
  { slug: 'what-price-will-bitcoin-hit-before-2027', category: 'crypto', displayName: 'BTC before 2027' },
  { slug: 'what-price-will-ethereum-hit-in-march-2026', category: 'crypto', displayName: 'ETH March 2026' },
  { slug: 'record-crypto-liquidation-in-2026', category: 'crypto', displayName: 'Record liquidation 2026' },
];


// Category colors for UI
export const CATEGORY_COLORS: Record<string, string> = {
  commodities: '#f59e0b',
  biotech: '#10b981',
  geopolitics: '#ef4444',
  economy: '#3b82f6',
  crypto: '#a855f7',
  science: '#06b6d4',
};

// Correlated market pairs for arbitrage detection
export interface ArbitragePair {
  marketA: string;
  marketB: string;
  correlation: string;
  divergenceThreshold: number;
}

export const ARBITRAGE_PAIRS: ArbitragePair[] = [
  { marketA: 'will-gold-gc-hit-by-end-of-march', marketB: 'gold-gc-above-end-of-march', correlation: 'same asset', divergenceThreshold: 5 },
  { marketA: 'will-crude-oil-cl-hit-by-end-of-march', marketB: 'crude-oil-cl-above-end-of-march', correlation: 'same asset', divergenceThreshold: 5 },
  { marketA: 'will-gold-gc-hit-by-end-of-march', marketB: 'gc-hit-jun-2026', correlation: 'time horizon', divergenceThreshold: 10 },
  { marketA: 'will-crude-oil-cl-hit-by-end-of-march', marketB: 'cl-hit-jun-2026', correlation: 'time horizon', divergenceThreshold: 10 },
  { marketA: 'what-price-will-bitcoin-hit-in-march-2026', marketB: 'what-price-will-bitcoin-hit-before-2027', correlation: 'BTC price path', divergenceThreshold: 15 },
  { marketA: 'us-forces-enter-iran-by', marketB: 'us-x-iran-ceasefire-by', correlation: 'conflict resolution', divergenceThreshold: 20 },
];
