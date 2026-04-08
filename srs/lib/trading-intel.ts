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

// Fetch trading snapshot via backend API (avoids CORS issues)
export async function getTradingSnapshot(): Promise<TradingSnapshot> {
  try {
    // Use backend API to avoid CORS
    const response = await fetch('/api/search?action=opportunities');
    
    if (!response.ok) {
      console.error('[trading-intel] API error:', response.status);
      const cached = readCachedSnapshot();
      return cached ? degradeSnapshot(cached, 'Using cached snapshot') : getFallbackSnapshot('API error');
    }
    
    const data = await response.json();
    if (!data.ok || !data.opportunities || data.opportunities.length === 0) {
      const cached = readCachedSnapshot();
      return cached ? degradeSnapshot(cached, 'Using cached snapshot') : getFallbackSnapshot('No opportunities');
    }
    
    // Convert opportunities to TradingPolymarketMarket format
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
    console.error('[trading-intel] Failed to fetch:', error);
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

// Import the filtering logic from the API
function filterAndCategorizeMarkets(rows: any[], limit: number): TradingPolymarketMarket[] {
  // Same filtering logic as server-side
  const EXCLUDE_TERMS = [
    'election', 'elect', 'vote', 'voting', 'primary', 'presidential',
    'trump', 'biden', 'harris', 'desantis', 'newsom', 'pence', 'clinton',
    'senate race', 'senate seat', 'house of representatives', 'congressional district',
    'governor race', 'mayor race', 'runoff', 'ballot',
    'democrat', 'republican', 'gop', 'nomination', 'candidate', 'campaign',
    'polling', 'electorate', 'swing state', 'battleground state', 'rally', 'debate',
    'golf', 'masters', 'nfl', 'nba', 'super bowl', 'stanley cup', 'nhl', 'mlb',
    'soccer', 'football', 'basketball', 'baseball', 'hockey', 'tennis', 'olympics',
    'fifa', 'world cup', 'champions league', 'premier league', 'ncaa', 'playoff',
    'oscar', 'grammy', 'emmy', 'taylor swift', 'beyonce', 'movie', 'film', 'album',
    'weinstein', 'epstein', 'depp', 'heard', 'celebrity', 'actor', 'actress',
    'gta', 'jesus', 'messi', 'ronaldo', 'lebron', 'brady', 'kardashian',
  ];
  
  const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'AI/Tech': ['openai', 'chatgpt', 'claude', 'nvidia', 'gpt-4', 'gpt-5', 'llm', 'anthropic', 'gemini', 'ai model', 'agi release'],
    'Crypto': ['bitcoin etf', 'ethereum etf', 'sec approval', 'binance settlement', 'coinbase', 'regulatory decision', 'etf approval'],
    'Global Conflict': ['ukraine', 'russia invasion', 'ceasefire', 'gaza', 'israel hamas', 'iran missile', 'taiwan conflict', 'invasion', 'sanctions'],
    'Biotech': ['fda approval', 'drug approval', 'clinical trial', 'phase 3', 'fda reject'],
    'Macro': ['fed rate cut', 'fed rate hike', 'interest rate', 'recession', 'gdp contraction', 'cpi report', 'fomc'],
    'Commodities': ['oil price', 'gold price', 'opec', 'supply cut', 'oil production'],
  };
  
  const marketsByCategory: Record<string, Array<{ market: TradingPolymarketMarket; score: number }>> = {};
  for (const category of Object.keys(CATEGORY_KEYWORDS)) {
    marketsByCategory[category] = [];
  }
  
  for (const row of rows) {
    try {
      const title = row?.question || row?.title || row?.marketName;
      if (!title) continue;
      
      const titleLower = title.toLowerCase();
      const description = String(row?.description || '').toLowerCase();
      const text = `${titleLower} ${description}`;
      
      // Skip 2024 markets
      if (titleLower.includes('2024')) continue;
      
      // Skip excluded terms
      if (EXCLUDE_TERMS.some(term => text.includes(term.toLowerCase()))) continue;
      
      // Skip ended markets
      const endDate = row?.endDate ? new Date(String(row.endDate)) : null;
      if (endDate) {
        const daysUntil = (endDate.getTime() - Date.now()) / 86_400_000;
        if (daysUntil < -7) continue;
      }
      
      // Liquidity check
      const liquidity = Number(row?.liquidity ?? row?.liquidityNum ?? 0);
      if (liquidity < 500_000) continue;
      
      // Find best category
      let bestCategory = '';
      let bestMatches = 0;
      
      for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        let matches = 0;
        for (const keyword of keywords) {
          if (text.includes(keyword)) matches++;
        }
        if (matches > 0 && matches > bestMatches) {
          bestMatches = matches;
          bestCategory = category;
        }
      }
      
      if (!bestCategory) continue;
      
      // Get prices
      let yesPrice = 0.5;
      let noPrice = 0.5;
      
      if (row?.outcomePrices) {
        const prices = JSON.parse(row.outcomePrices).map((p: string) => Number(p));
        if (prices.length >= 2) {
          yesPrice = prices[0];
          noPrice = prices[1];
        }
      } else if (row?.yesPrice != null) {
        yesPrice = Number(row.yesPrice);
        noPrice = row?.noPrice != null ? Number(row.noPrice) : 1 - yesPrice;
      }
      
      const volume = Number(row?.volume ?? row?.volumeNum ?? 0);
      
      // Score based on movement
      let score = 0;
      const priceMovement = Math.abs(yesPrice - 0.5);
      score += priceMovement * 100;
      const volumeRatio = liquidity > 0 ? volume / liquidity : 0;
      score += Math.min(volumeRatio * 30, 30);
      if (liquidity > 5_000_000) score += 15;
      else if (liquidity > 2_000_000) score += 10;
      else if (liquidity > 1_000_000) score += 5;
      
      const market: TradingPolymarketMarket = {
        id: String(row?.id || row?.conditionId || Date.now() + Math.random()),
        title: title.slice(0, 100),
        slug: row?.slug,
        yesPrice,
        noPrice,
        volume,
        liquidity,
        category: bestCategory,
        endDate: row?.endDate || row?.expirationDate,
        url: row?.slug ? `https://polymarket.com/market/${row.slug}` : 'https://polymarket.com',
      };
      
      marketsByCategory[bestCategory].push({ market, score });
    } catch (err) {
      // Skip malformed row
    }
  }
  
  // Sort each category
  for (const category of Object.keys(marketsByCategory)) {
    marketsByCategory[category].sort((a, b) => b.score - a.score);
  }
  
  // Build diverse results
  const result: TradingPolymarketMarket[] = [];
  const targetPerCategory = 2;
  
  for (const category of Object.keys(CATEGORY_KEYWORDS)) {
    const categoryMarkets = marketsByCategory[category];
    for (let i = 0; i < Math.min(targetPerCategory, categoryMarkets.length); i++) {
      result.push(categoryMarkets[i].market);
    }
  }
  
  if (result.length < limit) {
    const remaining: Array<{ market: TradingPolymarketMarket; score: number }> = [];
    for (const category of Object.keys(CATEGORY_KEYWORDS)) {
      const categoryMarkets = marketsByCategory[category];
      const startIndex = Math.min(targetPerCategory, categoryMarkets.length);
      remaining.push(...categoryMarkets.slice(startIndex));
    }
    remaining.sort((a, b) => b.score - a.score);
    result.push(...remaining.slice(0, limit - result.length).map(r => r.market));
  }
  
  return result.slice(0, limit);
}

function getFallbackPolymarketMarkets(limit: number): TradingPolymarketMarket[] {
  return [];
}
