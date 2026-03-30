export type SourceHealth = 'live' | 'degraded';

export type TradingSourceStatus = {
  key: 'polymarket' | 'kalshi' | 'yields' | 'energy' | 'whales' | 'watchtower' | 'quotes';
  label: string;
  status: SourceHealth;
  lastUpdated: string;
  detail?: string;
};

export type TradingPolymarketMarket = {
  id: string;
  title: string;
  slug?: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  category?: string;
  endDate?: string;
  url?: string;
};

export type TradingKalshiMarket = {
  id: string;
  ticker: string;
  title: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  category?: string;
  closeTime?: string;
  eventTicker?: string;
  subtitle?: string;
  url?: string;
};

export type TradingYieldPool = {
  id: string;
  symbol: string;
  chain: string;
  project: string;
  apy: number;
  tvl: number;
  apyChange24h?: number;
  apyBase?: number;
  apyReward?: number;
  viabilityScore?: number;
};

export type TradingWhaleTrade = {
  id: string;
  type: 'buy' | 'sell';
  value: number;
  valueFormatted: string;
  token: string;
  tokenSymbol: string;
  dex: string;
  chain: string;
  timestamp: number;
  txHash: string;
  explorerUrl?: string;
};

export type TradingWatchtowerItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  region?: string;
  tags?: string[];
};

export type TradingEnergySignal = {
  id: string;
  region: string;
  regionCode: string;
  metric: 'demand' | 'net_generation' | 'price' | 'stress';
  value: number;
  unit: string;
  timestamp: string;
  stressScore: number;
  summary: string;
  category: 'grid' | 'renewables' | 'outage' | 'power';
  lat?: number;
  lng?: number;
  source: string;
};

export type TradingQuote = {
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
  timestamp: string;
  source: string;
};

export type TradingSnapshot = {
  ok: true;
  generatedAt: string;
  sources: TradingSourceStatus[];
  polymarket: TradingPolymarketMarket[];
  kalshi: TradingKalshiMarket[];
  yields: TradingYieldPool[];
  energy: TradingEnergySignal[];
  whales: TradingWhaleTrade[];
  quotes: TradingQuote[];
  watchtower: TradingWatchtowerItem[];
};

const SNAPSHOT_CACHE_KEY = 'trading_snapshot_cache_v1';
const SNAPSHOT_CACHE_TTL_MS = 5 * 60 * 1000;

function readCachedSnapshot(): TradingSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { snapshot?: TradingSnapshot; ts?: number };
    if (!parsed?.snapshot || typeof parsed.ts !== 'number') return null;
    if (Date.now() - parsed.ts > SNAPSHOT_CACHE_TTL_MS) return null;
    return parsed.snapshot;
  } catch {
    return null;
  }
}

function writeCachedSnapshot(snapshot: TradingSnapshot) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SNAPSHOT_CACHE_KEY, JSON.stringify({ snapshot, ts: Date.now() }));
  } catch {
    // ignore
  }
}

function degradeSnapshot(snapshot: TradingSnapshot, detail: string): TradingSnapshot {
  const now = new Date().toISOString();
  return {
    ...snapshot,
    sources: snapshot.sources.map((source) =>
      source.key === 'polymarket'
        ? { ...source, status: 'degraded', detail, lastUpdated: now }
        : source
    ),
  };
}

export async function getTradingSnapshot(): Promise<TradingSnapshot> {
  try {
    const response = await fetch('/api/search?action=opportunities');
    if (!response.ok) {
      const cached = readCachedSnapshot();
      return cached ? degradeSnapshot(cached, 'Using cached snapshot') : getFallbackSnapshot('API error');
    }

    const data = await response.json();
    if (!data.ok || !data.opportunities) {
      const cached = readCachedSnapshot();
      return cached ? degradeSnapshot(cached, 'Using cached snapshot') : getFallbackSnapshot('Bad response');
    }

    const polymarket: TradingPolymarketMarket[] = data.opportunities.map((opp: any) => ({
      id: opp.market.id,
      title: opp.market.question,
      slug: opp.market.slug,
      yesPrice: opp.market.yesPrice,
      noPrice: opp.market.noPrice,
      volume: opp.market.volume,
      liquidity: opp.market.liquidity,
      category: opp.market.category,
      endDate: opp.market.endDate,
      url: opp.market.url,
    }));

    const snapshot: TradingSnapshot = {
      ok: true,
      generatedAt: new Date().toISOString(),
      sources: [
        { key: 'polymarket', label: 'Polymarket', status: 'live', lastUpdated: new Date().toISOString() },
        { key: 'kalshi', label: 'Kalshi', status: 'degraded', detail: 'Not configured', lastUpdated: new Date().toISOString() },
        { key: 'yields', label: 'DeFi Yields', status: 'degraded', detail: 'Not configured', lastUpdated: new Date().toISOString() },
        { key: 'whales', label: 'Whale Trades', status: 'degraded', detail: 'Not configured', lastUpdated: new Date().toISOString() },
        { key: 'quotes', label: 'Price Quotes', status: 'degraded', detail: 'Not configured', lastUpdated: new Date().toISOString() },
        { key: 'watchtower', label: 'Watchtower', status: 'degraded', detail: 'Not configured', lastUpdated: new Date().toISOString() },
      ],
      polymarket,
      kalshi: [],
      yields: [],
      energy: [],
      whales: [],
      quotes: [],
      watchtower: [],
    };

    writeCachedSnapshot(snapshot);
    return snapshot;
  } catch (error) {
    console.error('Failed to fetch Polymarket data:', error);
    const cached = readCachedSnapshot();
    return cached ? degradeSnapshot(cached, 'Using cached snapshot') : getFallbackSnapshot('Fetch failed');
  }
}

function getFallbackSnapshot(detail: string): TradingSnapshot {
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    sources: [
      { key: 'polymarket', label: 'Polymarket', status: 'degraded', detail, lastUpdated: new Date().toISOString() },
      { key: 'kalshi', label: 'Kalshi', status: 'degraded', detail: 'Not configured', lastUpdated: new Date().toISOString() },
      { key: 'yields', label: 'DeFi Yields', status: 'degraded', detail: 'Not configured', lastUpdated: new Date().toISOString() },
      { key: 'whales', label: 'Whale Trades', status: 'degraded', detail: 'Not configured', lastUpdated: new Date().toISOString() },
      { key: 'quotes', label: 'Price Quotes', status: 'degraded', detail: 'Not configured', lastUpdated: new Date().toISOString() },
      { key: 'watchtower', label: 'Watchtower', status: 'degraded', detail: 'Not configured', lastUpdated: new Date().toISOString() },
    ],
    polymarket: [],
    kalshi: [],
    yields: [],
    energy: [],
    whales: [],
    quotes: [],
    watchtower: [],
  };
}

// Legacy helpers retained below for compatibility with adjacent code paths.
function filterAndCategorizeMarkets(rows: any[], limit: number): TradingPolymarketMarket[] {
  void rows;
  void limit;
  return [];
}

function getFallbackPolymarketMarkets(limit: number): TradingPolymarketMarket[] {
  void limit;
  return [];
}
