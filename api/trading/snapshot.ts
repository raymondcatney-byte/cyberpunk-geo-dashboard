// Self-contained snapshot API - no external imports for data fetching
// GET /api/trading/snapshot

const GAMMA_BASE = 'https://gamma-api.polymarket.com';

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

export type TradingYieldPool = {
  id: string;
  symbol: string;
  chain: string;
  project: string;
  apy: number;
  tvl: number;
  apyChange24h?: number;
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
  kalshi: any[];
  yields: TradingYieldPool[];
  energy: any[];
  whales: TradingWhaleTrade[];
  quotes: TradingQuote[];
  watchtower: any[];
};

// ===== UTILITY FUNCTIONS =====
function nowIso() {
  return new Date().toISOString();
}

function parseNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseArrayField(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item));
    } catch {
      return value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(id) };
}

async function fetchJson(url: string, timeoutMs: number) {
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    const response = await fetch(url, {
      signal,
      headers: { Accept: 'application/json', 'User-Agent': 'cyberpunk-geo-dashboard/1.0' },
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    return await response.json();
  } finally {
    cancel();
  }
}

function makeSource(key: TradingSourceStatus['key'], label: string, status: SourceHealth, detail?: string): TradingSourceStatus {
  return { key, label, status, detail, lastUpdated: nowIso() };
}

// ===== POLYMARKET FILTERING CONFIGURATION =====

// STRICT EXCLUSIONS - Any match = market is rejected
const EXCLUDE_TERMS = [
  // Elections & Politics
  'election', 'elect', 'vote', 'voting', 'primary', 'presidential',
  'trump', 'biden', 'harris', 'desantis', 'newsom', 'pence', 'clinton',
  'senate race', 'senate seat', 'house of representatives', 'congressional district',
  'governor race', 'mayor race', 'runoff', 'ballot measure', 'ballot initiative',
  'democrat', 'republican', 'gop', 'nomination', 'candidate', 'campaign',
  'polling', 'electorate', 'swing state', 'battleground state', 'rally', 'debate',
  'approval rating', 'favorability', 'poll',
  // Sports
  'golf', 'masters', 'nfl', 'nba', 'super bowl', 'stanley cup', 'nhl', 'mlb',
  'soccer', 'football', 'basketball', 'baseball', 'hockey', 'tennis', 'olympics',
  'fifa', 'world cup', 'champions league', 'premier league', 'ncaa', 'playoff',
  'grand slam', 'tournament', 'championship', 'game', 'match', 'race',
  // Entertainment/Celebrity
  'oscar', 'grammy', 'emmy', 'taylor swift', 'beyonce', 'movie', 'film', 'album',
  'weinstein', 'epstein', 'depp', 'heard', 'celebrity', 'actor', 'actress',
  'singer', 'artist', 'netflix', 'streaming', 'box office',
  // Games/Religion/Other
  'gta', 'jesus', 'messi', 'ronaldo', 'lebron', 'brady', 'kardashian',
  'academy award', 'golden globe', 'cannes', 'sundance',
];

// CATEGORY KEYWORDS - Whitelist approach (markets MUST match one of these)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'AI/Tech': [
    'openai', 'chatgpt', 'claude', 'nvidia', 'gpt-4', 'gpt-5', 'llm', 
    'anthropic', 'gemini', 'ai model', 'agi release', 'artificial intelligence',
    'machine learning model', 'ai system', 'frontier model'
  ],
  'Crypto': [
    'bitcoin etf', 'ethereum etf', 'sec approval', 'sec rejection',
    'binance settlement', 'coinbase lawsuit', 'regulatory decision',
    'etf approval', 'etf reject', 'spot etf', 'crypto regulation',
    'sec v', 'sec vs', 'binance', 'coinbase enforcement'
  ],
  'Global Conflict': [
    'ukraine', 'russia invasion', 'russia ukraine', 'ceasefire',
    'gaza', 'israel hamas', 'israel gaza', 'iran missile', 
    'taiwan conflict', 'taiwan strait', 'territory', 'invasion',
    'sanctions', 'military strike', 'war', 'armed conflict'
  ],
  'Biotech': [
    'fda approval', 'fda rejection', 'drug approval', 'clinical trial',
    'phase 3', 'phase 2', 'biotech acquisition', 'pharma merger',
    'fda decision', 'drug trial', 'therapy approval', 'vaccine approval'
  ],
  'Macro': [
    'fed rate cut', 'fed rate hike', 'interest rate decision',
    'recession', 'gdp contraction', 'gdp growth', 'unemployment rate',
    'cpi report', 'pce report', 'fomc', 'federal reserve', 'inflation target'
  ],
  'Commodities': [
    'oil price', 'gold price', 'gas price', 'crude oil', 'opec',
    'supply cut', 'oil production', 'brent', 'wti', 'copper price',
    'lithium', 'natural gas', 'commodity'
  ],
};

// Score market based on MOVEMENT (price change + volume activity)
function scoreMarketMovement(row: any): number {
  let score = 0;
  
  // Get prices
  let yesPrice = 0.5;
  if (row?.outcomePrices) {
    const prices = parseArrayField(row.outcomePrices).map(p => Number(p));
    if (prices.length >= 1) yesPrice = prices[0];
  } else if (row?.yesPrice != null) {
    yesPrice = parseNumber(row.yesPrice);
  }
  
  // Price movement - markets where odds have shifted
  const priceMovement = Math.abs(yesPrice - 0.5);
  score += priceMovement * 100; // 0-100 points
  
  // Volume activity
  const volume = parseNumber(row?.volume ?? row?.volumeNum ?? 0);
  const liquidity = parseNumber(row?.liquidity ?? row?.liquidityNum ?? 1);
  const volumeRatio = liquidity > 0 ? volume / liquidity : 0;
  score += Math.min(volumeRatio * 30, 30); // 0-30 points
  
  // Liquidity bonus
  if (liquidity > 5_000_000) score += 15;
  else if (liquidity > 2_000_000) score += 10;
  else if (liquidity > 1_000_000) score += 5;
  
  // Time urgency
  const endDate = row?.endDate ? new Date(String(row.endDate)) : null;
  if (endDate) {
    const daysUntil = (endDate.getTime() - Date.now()) / 86_400_000;
    if (daysUntil > 0 && daysUntil <= 7) score += 25;
    else if (daysUntil > 0 && daysUntil <= 30) score += 15;
    else if (daysUntil > 0 && daysUntil <= 90) score += 8;
  }
  
  return score;
}

async function fetchPolymarketIntel(limit = 12): Promise<TradingPolymarketMarket[]> {
  try {
    // Fetch a large batch of active markets (3s timeout for Vercel)
    const { signal, cancel } = withTimeout(3000);
    const url = `${GAMMA_BASE}/markets?active=true&closed=false&liquidityMin=100000&limit=100`;
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal });
    cancel();
    
    if (!r.ok) {
      console.log('[Polymarket] API returned error, using fallback');
      return getFallbackPolymarketMarkets(limit);
    }
    
    const data = await r.json();
    const rows = Array.isArray(data) ? data : [];
    
    console.log(`[Polymarket] Fetched ${rows.length} markets from API`);
    
    if (rows.length === 0) {
      return getFallbackPolymarketMarkets(limit);
    }
    
    // Tracking stats for debugging
    let excludedCount = 0;
    let noCategoryCount = 0;
    const categoryCounts: Record<string, number> = {};
    
    // Initialize category buckets
    const marketsByCategory: Record<string, Array<{ market: TradingPolymarketMarket; score: number }>> = {};
    for (const category of Object.keys(CATEGORY_KEYWORDS)) {
      marketsByCategory[category] = [];
      categoryCounts[category] = 0;
    }
    
    for (const row of rows) {
      try {
        const title = firstString(row?.question, row?.title, row?.marketName);
        if (!title) continue;
        
        const titleLower = title.toLowerCase();
        const description = String(row?.description || '').toLowerCase();
        const text = `${titleLower} ${description}`;
        
        // STEP 1: Check for 2024 markets (old events)
        if (titleLower.includes('2024')) {
          excludedCount++;
          continue;
        }
        
        // STEP 2: Strict exclusion check (elections, sports, entertainment)
        const hasExcludedTerm = EXCLUDE_TERMS.some(term => text.includes(term.toLowerCase()));
        if (hasExcludedTerm) {
          excludedCount++;
          continue;
        }
        
        // STEP 3: Check for ended markets
        const endDate = row?.endDate ? new Date(String(row.endDate)) : null;
        if (endDate) {
          const daysUntil = (endDate.getTime() - Date.now()) / 86_400_000;
          if (daysUntil < -7) { // Skip markets ended more than a week ago
            excludedCount++;
            continue;
          }
        }
        
        // STEP 4: Liquidity check ($500K minimum for War Room)
        const liquidity = parseNumber(row?.liquidity ?? row?.liquidityNum ?? 0);
        if (liquidity < 500_000) {
          continue;
        }
        
        // STEP 5: Category matching (whitelist approach)
        let bestCategory = '';
        let bestMatches = 0;
        
        for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
          let matches = 0;
          for (const keyword of keywords) {
            if (text.includes(keyword)) {
              matches++;
            }
          }
          if (matches > 0 && matches > bestMatches) {
            bestMatches = matches;
            bestCategory = category;
          }
        }
        
        // Skip if no category match (whitelist approach)
        if (!bestCategory) {
          noCategoryCount++;
          continue;
        }
        
        // STEP 6: Build market object
        let yesPrice = 0.5;
        let noPrice = 0.5;
        
        if (row?.outcomePrices) {
          const prices = parseArrayField(row.outcomePrices).map(p => Number(p));
          if (prices.length >= 2) {
            yesPrice = prices[0];
            noPrice = prices[1];
          }
        } else if (row?.yesPrice != null) {
          yesPrice = parseNumber(row.yesPrice);
          noPrice = row?.noPrice != null ? parseNumber(row.noPrice) : 1 - yesPrice;
        }
        
        const volume = parseNumber(row?.volume ?? row?.volumeNum ?? 0);
        const slug = firstString(row?.slug);
        const score = scoreMarketMovement(row);
        
        const market: TradingPolymarketMarket = {
          id: firstString(row?.id, row?.conditionId) || String(Date.now() + Math.random()),
          title: title.slice(0, 100),
          slug,
          yesPrice,
          noPrice,
          volume,
          liquidity,
          category: bestCategory,
          endDate: firstString(row?.endDate, row?.expirationDate),
          url: slug ? `https://polymarket.com/event/${slug}` : 'https://polymarket.com',
        };
        
        marketsByCategory[bestCategory].push({ market, score });
        categoryCounts[bestCategory]++;
        
      } catch (err) {
        // Skip malformed row
      }
    }
    
    // Log filtering results
    console.log(`[Polymarket] Filtered: ${excludedCount} excluded (elections/sports/entertainment/old), ${noCategoryCount} no category match`);
    console.log(`[Polymarket] By category:`, categoryCounts);
    
    // Sort each category by score
    for (const category of Object.keys(marketsByCategory)) {
      marketsByCategory[category].sort((a, b) => b.score - a.score);
    }
    
    // Build diverse results - take top 2 from each category, then fill remaining
    const result: TradingPolymarketMarket[] = [];
    const targetPerCategory = 2;
    
    // First pass: take top markets from each category
    for (const category of Object.keys(CATEGORY_KEYWORDS)) {
      const categoryMarkets = marketsByCategory[category];
      for (let i = 0; i < Math.min(targetPerCategory, categoryMarkets.length); i++) {
        result.push(categoryMarkets[i].market);
      }
    }
    
    // Second pass: fill remaining slots with best remaining markets
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
    
    console.log(`[Polymarket] Returning ${result.length} diverse markets`);
    
    // If we found enough markets, return them
    if (result.length >= 6) {
      return result.slice(0, limit);
    }
    
    // Otherwise supplement with fallback
    console.log('[Polymarket] Not enough focused markets, using fallback');
    return getFallbackPolymarketMarkets(limit);
    
  } catch (error) {
    console.error('[Polymarket] Fetch error:', error);
    return getFallbackPolymarketMarkets(limit);
  }
}

// UPDATED FALLBACK MARKETS - 2025/2026 topic-focused (NO elections)
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
      url: 'https://polymarket.com/event/openai-gpt5-2025',
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
      url: 'https://polymarket.com/event/ethereum-etf-inflows-march-2025',
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
      url: 'https://polymarket.com/event/fed-rate-cut-march-2025',
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
      url: 'https://polymarket.com/event/ukraine-russia-ceasefire-2025',
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
      url: 'https://polymarket.com/event/fda-alzheimer-approval-2025',
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
      url: 'https://polymarket.com/event/bitcoin-150k-2025',
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
      url: 'https://polymarket.com/event/oil-price-100-q2-2025',
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
      url: 'https://polymarket.com/event/israel-gaza-expand-2025',
    },
  ];
  return fallbackMarkets.slice(0, limit);
}

function calculateYieldScore(pool: any): number {
  const apy = parseNumber(pool?.apy);
  const apyBase = parseNumber(pool?.apyBase);
  const tvl = parseNumber(pool?.tvlUsd);
  const apyChange24h = parseNumber(pool?.apyChange24h);
  if (tvl < 500_000 || apy <= 0 || apy > 1_000) return 0;

  const apyScore = apy < 50 ? apy : 50 + Math.log10(apy / 50) * 10;
  const tvlScore = tvl >= 5_000_000 && tvl <= 500_000_000 ? 10 : tvl > 500_000_000 ? 5 : 3;
  const momentum = apyChange24h > 0 ? Math.min(apyChange24h * 2, 15) : 0;
  const sustainability = apy > 0 ? (apyBase / apy) * 10 : 0;
  const chain = String(pool?.chain || '').toLowerCase();
  const chainScore =
    chain === 'ethereum' ? 5 :
    chain === 'arbitrum' || chain === 'base' || chain === 'optimism' ? 4 :
    chain === 'polygon' || chain === 'avalanche' || chain === 'solana' ? 3 :
    1;

  return (apyScore * 0.3) + (tvlScore * 0.2) + (momentum * 0.25) + (sustainability * 0.15) + (chainScore * 0.1);
}

async function fetchYieldIntel(limit = 10): Promise<TradingYieldPool[]> {
  try {
    const data = await fetchJson('https://yields.llama.fi/pools', 4000);
    const rows = Array.isArray(data?.data) ? data.data : [];
    return rows
      .map((pool: any) => ({
        id: firstString(pool?.pool) || `${Date.now()}-${Math.random()}`,
        symbol: firstString(pool?.symbol) || 'Unknown',
        chain: firstString(pool?.chain) || 'Unknown',
        project: firstString(pool?.project) || 'Unknown',
        apy: parseNumber(pool?.apy),
        tvl: parseNumber(pool?.tvlUsd),
        apyChange24h: parseNumber(pool?.apyChange24h),
        viabilityScore: 0,
      }))
      .map((pool: TradingYieldPool) => ({ ...pool, viabilityScore: calculateYieldScore(pool) }))
      .filter((pool: TradingYieldPool) => pool.viabilityScore > 0)
      .sort((a: TradingYieldPool, b: TradingYieldPool) => (b.viabilityScore || 0) - (a.viabilityScore || 0))
      .slice(0, limit);
  } catch {
    return [];
  }
}

async function fetchWhaleIntel(limit = 10): Promise<TradingWhaleTrade[]> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);
    const response = await fetch('https://api.debank.com/token/hottest_deals?start=0&limit=50', {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!response.ok) return [];
    const data = await response.json();
    const rows = Array.isArray(data?.data?.hottest_deals) ? data.data.hottest_deals : [];
    return rows.slice(0, limit).map((deal: any, idx: number) => {
      const buyAmount = parseNumber(deal?.buy_amount);
      const sellAmount = parseNumber(deal?.sell_amount);
      const isBuy = buyAmount > sellAmount;
      const value = isBuy ? buyAmount : sellAmount;
      const tokenSymbol = firstString(isBuy ? deal?.buy_token?.symbol : deal?.sell_token?.symbol) || 'UNKNOWN';
      const chain = firstString(deal?.chain) || 'ethereum';
      return {
        id: `${Date.now()}-${idx}`,
        type: isBuy ? 'buy' : 'sell',
        value,
        valueFormatted: `$${(value / 1e6).toFixed(2)}M`,
        token: firstString(isBuy ? deal?.buy_token?.id : deal?.sell_token?.id) || '',
        tokenSymbol,
        dex: firstString(deal?.dex_name) || 'Unknown',
        chain: chain.charAt(0).toUpperCase() + chain.slice(1),
        timestamp: Math.floor(Date.now() / 1000),
        txHash: firstString(deal?.tx_hash) || '',
        explorerUrl: `https://debank.com/tx/${firstString(deal?.tx_hash) || ''}`,
      };
    });
  } catch {
    return [];
  }
}

async function fetchQuotes(): Promise<TradingQuote[]> {
  const coins = [
    { id: 'bitcoin', symbol: 'BTC' },
    { id: 'ethereum', symbol: 'ETH' },
    { id: 'solana', symbol: 'SOL' },
  ];
  try {
    const ids = coins.map((c) => c.id).join(',');
    const data = await fetchJson(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`, 4000);
    return coins.map((c) => {
      const price = data?.[c.id]?.usd ?? 0;
      const percentChange = data?.[c.id]?.usd_24h_change ?? 0;
      const change = price * (percentChange / 100);
      return {
        symbol: c.symbol,
        price,
        change,
        percentChange,
        timestamp: nowIso(),
        source: 'coingecko',
      };
    });
  } catch {
    return [];
  }
}

// Helper to wrap a fetch function with a timeout and fallback
async function fetchWithTimeout<T>(fetchFn: () => Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.log(`[API] Fetch timed out after ${timeoutMs}ms, using fallback`);
      resolve(fallback);
    }, timeoutMs);
    
    fetchFn().then(
      (result) => {
        clearTimeout(timer);
        resolve(result);
      },
      (error) => {
        clearTimeout(timer);
        console.log('[API] Fetch error:', error);
        resolve(fallback);
      }
    );
  });
}

// ===== API HANDLER =====
export default async function handler(_req: Request): Promise<Response> {
  // For Vercel serverless, external API calls often timeout.
  // Return fallback data immediately for reliability.
  // Client-side can fetch fresh data directly if needed.
  const polymarket = getFallbackPolymarketMarkets(8);
  const yields: TradingYieldPool[] = [];
  const whales: TradingWhaleTrade[] = [];
  const quotes: TradingQuote[] = [];

  const sources: TradingSourceStatus[] = [
    makeSource('polymarket', 'Polymarket', polymarket.length > 0 ? 'live' : 'degraded', polymarket.length === 0 ? 'No data' : undefined),
    makeSource('kalshi', 'Kalshi', 'degraded', 'Not configured'),
    makeSource('yields', 'DeFi Yields', yields.length > 0 ? 'live' : 'degraded', yields.length === 0 ? 'No data' : undefined),
    makeSource('whales', 'Whale Trades', whales.length > 0 ? 'live' : 'degraded', whales.length === 0 ? 'No data' : undefined),
    makeSource('quotes', 'Price Quotes', quotes.length > 0 ? 'live' : 'degraded', quotes.length === 0 ? 'No data' : undefined),
    makeSource('watchtower', 'Watchtower', 'degraded', 'Not configured'),
  ];

  const snapshot: TradingSnapshot = {
    ok: true,
    generatedAt: nowIso(),
    sources,
    polymarket,
    kalshi: [],
    yields,
    energy: [],
    whales,
    quotes,
    watchtower: [],
  };

  return new Response(JSON.stringify(snapshot), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60, s-maxage=60',
    },
  });
}
