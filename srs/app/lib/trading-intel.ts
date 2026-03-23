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

// Client-side fetch directly from Polymarket Gamma API
// This bypasses serverless function issues on Vercel
export async function getTradingSnapshot(): Promise<TradingSnapshot> {
  try {
    // Fetch directly from Polymarket's public API
    const response = await fetch('https://gamma-api.polymarket.com/markets?active=true&closed=false&liquidityMin=100000&limit=100', {
      headers: { Accept: 'application/json' }
    });
    
    if (!response.ok) {
      // Return fallback data on error
      return getFallbackSnapshot();
    }
    
    const data = await response.json();
    const rows = Array.isArray(data) ? data : [];
    
    // Filter and categorize markets (same logic as server)
    const polymarket = filterAndCategorizeMarkets(rows, 12);
    
    return {
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
  } catch (error) {
    console.error('Failed to fetch Polymarket data:', error);
    return getFallbackSnapshot();
  }
}

function getFallbackSnapshot(): TradingSnapshot {
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    sources: [
      { key: 'polymarket', label: 'Polymarket', status: 'degraded', detail: 'Using fallback', lastUpdated: new Date().toISOString() },
      { key: 'kalshi', label: 'Kalshi', status: 'degraded', detail: 'Not configured', lastUpdated: new Date().toISOString() },
      { key: 'yields', label: 'DeFi Yields', status: 'degraded', detail: 'Not configured', lastUpdated: new Date().toISOString() },
      { key: 'whales', label: 'Whale Trades', status: 'degraded', detail: 'Not configured', lastUpdated: new Date().toISOString() },
      { key: 'quotes', label: 'Price Quotes', status: 'degraded', detail: 'Not configured', lastUpdated: new Date().toISOString() },
      { key: 'watchtower', label: 'Watchtower', status: 'degraded', detail: 'Not configured', lastUpdated: new Date().toISOString() },
    ],
    polymarket: getFallbackPolymarketMarkets(8),
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
  
  return result.length >= 6 ? result.slice(0, limit) : getFallbackPolymarketMarkets(limit);
}

function getFallbackPolymarketMarkets(limit: number): TradingPolymarketMarket[] {
  const fallbackMarkets: TradingPolymarketMarket[] = [
    {
      id: 'fallback-1',
      title: 'Will OpenAI release GPT-5 by end of 2025?',
      slug: 'openai-gpt5-2025',
      yesPrice: 0.45,
      noPrice: 0.55,
      volume: 28000000,
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
      liquidity: 6200000,
      category: 'Global Conflict',
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
      liquidity: 4800000,
      category: 'Global Conflict',
      endDate: '2026-01-01',
      url: 'https://polymarket.com/market/israel-gaza-expand-2025',
    },
  ];
  return fallbackMarkets.slice(0, limit);
}
