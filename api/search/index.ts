// Polymarket Search API - Multi-API Aggregation (Gamma + Data + CLOB)
// Fetches from ALL 3 APIs simultaneously for maximum coverage

import { getRequestUrl } from '../../server/request_url.js';
import { getCommsMasterMarkets, getWatchlistAnomalies, getWatchlistOpportunities } from '../../server/polymarket_watchlist.js';

interface Market {
  id: string;
  question: string;
  description: string;
  slug: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  endDate: string;
  url: string;
}

interface MasterMarketsResponse {
  ok: boolean;
  masterMarkets: Record<string, Market[]>;
  counts: Record<string, number>;
  apiStats: Record<string, number>;
  timestamp: string;
  error?: string;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

// UPDATED Tag IDs - Validated for clean data
const CATEGORY_TAGS: Record<string, number> = {
  // Standard Overwatch categories (matches OPPORTUNITY_TAGS)
  GEOPOLITICS: 100265,  // ✅ Clean
  ECONOMY: 100328,      // ✅ Economy
  FINANCE: 120,         // ✅ FINANCE tag (clean)
  TECH: 1401,           // ✅ Tech
  CRYPTO: 21,           // ✅ Crypto
  // Sub-categories (need keyword filtering)
  AI: 1401,             // ⚠️ TECH tag - needs keyword filter
  DeFi: 21,             // ⚠️ CRYPTO tag - needs keyword filter
  MACRO: 120,           // ✅ FINANCE tag (clean)
  ENERGY_COMMODITIES: 100328, // ⚠️ ECONOMY tag - needs keyword filter
  BIOTECH: 2            // ⚠️ POLITICS tag - needs keyword filter
};

// Keyword filters for broad tags (tag_id alone isn't precise enough)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  // AI: Filter TECH markets for AI-specific terms
  AI: ['ai', 'artificial intelligence', 'openai', 'chatgpt', 'gpt', 'llm', 'claude', 'anthropic', 'deepmind', 'gemini', 'machine learning', 'neural', 'alignment', 'agi'],
  
  // DeFi: Filter CRYPTO markets for DeFi-specific terms
  DeFi: ['defi', 'uniswap', 'yield', 'staking', 'lending', 'amm', 'liquidity', 'protocol', 'dex', 'vault', 'farm', 'pool', 'curve', 'aave', 'compound'],
  
  // ENERGY_COMMODITIES: Filter FINANCE markets for energy/commodity terms
  ENERGY_COMMODITIES: ['oil', 'gold', 'crude', '(cl)', '(gc)', 'natural gas', 'copper', 'silver', 'commodity', 'wti', 'brent', 'gasoline', 'heating oil', 'platinum', 'palladium'],
  
  // BIOTECH: Filter all markets for biotech terms (broad search)
  BIOTECH: ['biotech', 'fda', 'clinical trial', 'pharma', 'drug approval', 'therapeutics', 'vaccine', 'medical device', 'pdufa', 'nda', 'bla', 'phase 3', 'phase iii']
};

// Country keywords for nation filtering
const COUNTRY_KEYWORDS: Record<string, string[]> = {
  ISR: ['israel', 'gaza', 'palestine', 'hamas', 'netanyahu', 'idf', 'jerusalem'],
  UKR: ['ukraine', 'zelensky', 'kyiv', 'kiev'],
  RUS: ['russia', 'putin', 'moscow', 'kremlin'],
  CHN: ['china', 'xi', 'beijing', 'taiwan', 'tsmc'],
  IRN: ['iran', 'tehran', 'ayatollah'],
  TWN: ['taiwan', 'tsmc', 'strait']
};

// Opportunity detection tags (Geopolitics, Economy, Finance, Tech, Crypto)
const OPPORTUNITY_TAGS: Record<number, string> = {
  100265: 'GEOPOLITICS',
  100328: 'ECONOMY', 
  120: 'FINANCE',
  1401: 'TECH',
  21: 'CRYPTO'
};

// Sports blacklist for opportunities
const OPPORTUNITY_BLACKLIST = [
  'fifa', 'world cup', 'nba', 'nhl', 'nfl', 'mlb', 'stanley cup', 'finals',
  'uefa', 'champions league', 'grizzlies', 'senators', 'warriors', 'mavericks',
  'celtics', 'lakers', 'neymar', 'soccer', 'football'
];

type AnomalyType = 'volume_spike' | 'price_swing' | 'volume_accel' | 'liquidity' | 'smart_money';

interface Opportunity {
  market: Market;
  anomalies: AnomalyType[];
  compositeScore: number;
}

// Categories that need keyword filtering (not clean tags)
const NEEDS_KEYWORD_FILTER = ['AI', 'DeFi', 'ENERGY_COMMODITIES', 'BIOTECH'];

// Sports/Entertainment blacklist - STRICT REJECTION
const BLACKLIST_REGEX = /\b(NBA|NHL|MLB|FIFA|NFL|World Cup|Stanley Cup|Finals|Grizzlies|Senators|Warriors|UEFA|Champions League|UFC|GTA VI|Movie|Actor|Oscar|Grammy|Basketball|Baseball|Football|Soccer|Hockey|Tennis|Golf)\b/i;

function isSportsOrEntertainment(title: string): boolean {
  return BLACKLIST_REGEX.test(title);
}

function matchesCategoryKeywords(title: string, description: string, category: string): boolean {
  // Clean categories don't need keyword filtering
  if (!NEEDS_KEYWORD_FILTER.includes(category)) return true;
  
  const keywords = CATEGORY_KEYWORDS[category];
  if (!keywords || keywords.length === 0) return true;
  
  const text = (title + ' ' + description).toLowerCase();
  return keywords.some(kw => text.includes(kw.toLowerCase()));
}

function parseMarket(row: any, category: string): Market | null {
  try {
    const title = row.question || row.title || '';
    const description = row.description || '';
    if (!title) return null;

    // STRICT BLACKLIST CHECK
    if (isSportsOrEntertainment(title)) return null;
    
    // KEYWORD FILTER CHECK (for broad tags like TECH, CRYPTO, etc.)
    if (!matchesCategoryKeywords(title, description, category)) return null;

    let yesPrice = 0.5;
    let noPrice = 0.5;
    if (row.outcomePrices) {
      const prices = JSON.parse(row.outcomePrices);
      yesPrice = parseFloat(prices[0]) || 0.5;
      noPrice = parseFloat(prices[1]) || 0.5;
    } else if (row.yesPrice != null) {
      yesPrice = parseFloat(row.yesPrice);
      noPrice = parseFloat(row.noPrice) || (1 - yesPrice);
    }

    const liquidity = parseFloat(row.liquidity || row.liquidityNum || 0);
    const volume = parseFloat(row.volume || row.volumeNum || 0);

    // NO VOLUME FILTER - Include ALL markets regardless of liquidity
    return {
      id: row.id || row.conditionId || String(Date.now()),
      question: title.slice(0, 300),
      description: (row.description || '').slice(0, 500),
      slug: row.slug || '',
      category,
      yesPrice,
      noPrice,
      volume,
      liquidity,
      endDate: row.endDate || row.expirationDate || '',
      url: row.slug ? `https://polymarket.com/event/${row.slug}` : 'https://polymarket.com'
    };
  } catch {
    return null;
  }
}

// Opportunity detection helpers
function isOpportunitySports(title: string): boolean {
  // Use the comprehensive regex-based check
  return isSportsOrEntertainment(title);
}

function calcMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calcStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = calcMean(values);
  const variance = values.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calcZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

function detectOpportunities(markets: Market[]): Opportunity[] {
  if (markets.length === 0) return [];

  const volumes = markets.map(m => m.volume);
  const volumeMean = calcMean(volumes);
  const volumeStd = calcStdDev(volumes);

  return markets.map(market => {
    const anomalies: AnomalyType[] = [];

    // 1. Volume Spike: Z-score > 2
    const volumeZScore = calcZScore(market.volume, volumeMean, volumeStd);
    if (volumeZScore > 2) {
      anomalies.push('volume_spike');
    }

    // 2. Price Swing: > 10% change (using yesPrice as proxy)
    const priceChange = Math.abs(market.yesPrice - 0.5); // Simplified
    if (priceChange > 0.1) {
      anomalies.push('price_swing');
    }

    // 3. Volume Acceleration: Volume > 3x mean
    const volumeAccel = volumeMean > 0 ? market.volume / volumeMean : 0;
    if (volumeAccel > 3) {
      anomalies.push('volume_accel');
    }

    // 4. Liquidity Anomaly: Tight spread + high volume
    const spread = Math.abs(market.yesPrice - market.noPrice);
    const isTightSpread = spread < 0.02;
    const isHighVolume = market.volume > volumeMean;
    if (isTightSpread && isHighVolume) {
      anomalies.push('liquidity');
    }

    // 5. Smart Money: High volume + tight spread + price away from 50%
    const hasPriceMove = Math.abs(market.yesPrice - 0.5) > 0.05;
    if (isHighVolume && isTightSpread && hasPriceMove) {
      anomalies.push('smart_money');
    }

    // Calculate composite score
    let compositeScore = 0;
    compositeScore += Math.max(0, volumeZScore) * 1.5;
    compositeScore += priceChange * 100 * 0.2;
    compositeScore += Math.max(0, volumeAccel - 1) * 1.2;
    if (anomalies.includes('liquidity')) compositeScore += 15;
    if (anomalies.includes('smart_money')) compositeScore += 20;

    return {
      market,
      anomalies,
      compositeScore: Math.round(compositeScore)
    };
  });
}

// Fetch from Gamma API
async function fetchGamma(tagId: number, category: string): Promise<Market[]> {
  const markets: Market[] = [];
  const url = `https://gamma-api.polymarket.com/events?tag_id=${tagId}&closed=false&active=true&limit=100`;
  
  try {
    console.log(`[API] Fetching Gamma: ${url}`);
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    
    if (!response.ok) {
      console.error(`[API] Gamma failed for tag ${tagId}: ${response.status}`);
      return markets;
    }
    
    const events = await response.json();
    console.log(`[API] Gamma returned ${events.length} events for tag ${tagId}`);
    
    if (!Array.isArray(events)) {
      console.error(`[API] Gamma invalid response for tag ${tagId}: not an array`);
      return markets;
    }

    for (const event of events) {
      if (isSportsOrEntertainment(event.title || '')) continue;
      const eventMarkets = event.markets || [];
      for (const row of eventMarkets) {
        const market = parseMarket(row, category);
        if (market) markets.push(market);
      }
    }
    
    console.log(`[API] Gamma parsed ${markets.length} markets for ${category}`);
  } catch (err) {
    console.error(`[API] Gamma error for tag ${tagId}:`, err);
  }
  return markets;
}

// Fetch from Data API
async function fetchDataAPI(tagId: number, category: string): Promise<Market[]> {
  const markets: Market[] = [];
  const url = `https://data-api.polymarket.com/markets?tag_id=${tagId}&closed=false&active=true&limit=100`;
  
  try {
    console.log(`[API] Fetching Data API: ${url}`);
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    
    if (!response.ok) {
      console.error(`[API] Data API failed for tag ${tagId}: ${response.status}`);
      return markets;
    }
    
    const rows = await response.json();
    console.log(`[API] Data API returned ${rows.length} rows for tag ${tagId}`);
    
    if (!Array.isArray(rows)) {
      console.error(`[API] Data API invalid response for tag ${tagId}: not an array`);
      return markets;
    }

    for (const row of rows) {
      const market = parseMarket(row, category);
      if (market) markets.push(market);
    }
    
    console.log(`[API] Data API parsed ${markets.length} markets for ${category}`);
  } catch (err) {
    console.error(`[API] Data API error for tag ${tagId}:`, err);
  }
  return markets;
}

// Fetch from CLOB API
async function fetchCLOB(tagId: number, category: string): Promise<Market[]> {
  const markets: Market[] = [];
  try {
    const response = await fetch(
      `https://clob.polymarket.com/markets?tag_id=${tagId}&closed=false&active=true&limit=100`,
      { headers: { Accept: 'application/json' } }
    );
    if (!response.ok) return markets;
    
    const rows = await response.json();
    if (!Array.isArray(rows)) return markets;

    for (const row of rows) {
      const market = parseMarket(row, category);
      if (market) markets.push(market);
    }
  } catch {
    // Ignore errors
  }
  return markets;
}

// Special fetch for BIOTECH - searches across ALL tag IDs, filters by keywords only
async function fetchBiotechAcrossAllTags(): Promise<{ gamma: Market[], data: Market[], clob: Market[] }> {
  const allGamma: Market[] = [];
  const allData: Market[] = [];
  const allClob: Market[] = [];
  
  // Search across all clean tag IDs for biotech keywords
  const tagsToSearch = [100265, 1401, 21, 120, 100328, 2];
  
  for (const tagId of tagsToSearch) {
    const [gamma, data, clob] = await Promise.all([
      fetchGamma(tagId, 'BIOTECH'),
      fetchDataAPI(tagId, 'BIOTECH'),
      fetchCLOB(tagId, 'BIOTECH')
    ]);
    allGamma.push(...gamma);
    allData.push(...data);
    allClob.push(...clob);
  }
  
  return { gamma: allGamma, data: allData, clob: allClob };
}

// Merge markets from all 3 APIs, deduplicate by ID
function mergeMarkets(gamma: Market[], data: Market[], clob: Market[]): { markets: Market[], stats: { gamma: number, data: number, clob: number, unique: number } } {
  const marketMap = new Map<string, Market>();
  
  // Add gamma markets first
  for (const m of gamma) {
    marketMap.set(m.id, m);
  }
  
  // Add data markets (will overwrite if same ID)
  for (const m of data) {
    marketMap.set(m.id, m);
  }
  
  // Add clob markets
  for (const m of clob) {
    marketMap.set(m.id, m);
  }
  
  const markets = Array.from(marketMap.values());
  
  return {
    markets,
    stats: {
      gamma: gamma.length,
      data: data.length,
      clob: clob.length,
      unique: markets.length
    }
  };
}

export default async function handler(req: any, res: any) {
  try {
    const action = String((req.query?.action ?? 'search') as any);

    if (action === 'hyperliquid_info') {
      if (req.method !== 'POST') {
        res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
        return;
      }

      const MAX_BYTES = 20_000;
      const allowedTypes = new Set(['allMids', 'candleSnapshot']);

      const readJsonBody = async () => {
        if (req.body != null) {
          if (typeof req.body === 'string') return JSON.parse(req.body);
          return req.body;
        }

        const chunks: Buffer[] = [];
        let total = 0;
        await new Promise<void>((resolve, reject) => {
          req.on('data', (chunk: Buffer) => {
            total += chunk.length;
            if (total > MAX_BYTES) {
              reject(new Error('PAYLOAD_TOO_LARGE'));
              return;
            }
            chunks.push(chunk);
          });
          req.on('end', () => resolve());
          req.on('error', (err: any) => reject(err));
        });

        const raw = Buffer.concat(chunks).toString('utf8');
        return raw ? JSON.parse(raw) : null;
      };

      const body = await readJsonBody().catch((err) => {
        throw new Error(err instanceof Error ? err.message : 'BAD_REQUEST');
      });

      const type = typeof body?.type === 'string' ? body.type : '';
      if (!allowedTypes.has(type)) {
        res.status(400).json({ ok: false, error: 'UNSUPPORTED_TYPE' });
        return;
      }

      let payload: any = { type };
      if (type === 'candleSnapshot') {
        const reqBody = body?.req && typeof body.req === 'object' ? body.req : null;
        const coin = typeof reqBody?.coin === 'string' ? reqBody.coin : '';
        const interval = typeof reqBody?.interval === 'string' ? reqBody.interval : '';
        const startTime = Number(reqBody?.startTime);
        const endTime = Number(reqBody?.endTime);

        if (!coin || !interval || !Number.isFinite(startTime) || !Number.isFinite(endTime)) {
          res.status(400).json({ ok: false, error: 'BAD_REQUEST' });
          return;
        }

        payload = {
          type,
          req: {
            coin: String(coin).slice(0, 20),
            interval: String(interval).slice(0, 10),
            startTime: Math.max(0, Math.trunc(startTime)),
            endTime: Math.max(0, Math.trunc(endTime)),
          },
        };
      }

      const upstream = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'cyberpunk-dashboard-v2/1.0',
        },
        body: JSON.stringify(payload),
      });

      const data = await upstream.json().catch(() => null);
      if (!upstream.ok || data == null) {
        res.status(502).json({ ok: false, error: 'UPSTREAM' });
        return;
      }

      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
      res.status(200).json({ ok: true, data, timestamp: new Date().toISOString() });
      return;
    }

    if (req.method !== 'GET') {
      res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
      return;
    }

    // Action: masterMarkets - Shared normalized category snapshot for Comms/HUD
    if (action === 'masterMarkets') {
      const payload = await getCommsMasterMarkets();
      const response: MasterMarketsResponse = {
        ok: payload.ok,
        masterMarkets: payload.masterMarkets as unknown as Record<string, Market[]>,
        counts: payload.counts as unknown as Record<string, number>,
        apiStats: payload.apiStats,
        timestamp: payload.timestamp,
      };
      res.status(200).json(response);
      return;
    }

    // Action: countryMarkets - Filter markets by country keywords
    if (action === 'countryMarkets') {
      const country = String(req.query.country || '').toUpperCase();
      if (!country || !COUNTRY_KEYWORDS[country]) {
        res.status(400).json({ ok: false, error: 'INVALID_COUNTRY' });
        return;
      }
      
      const keywords = COUNTRY_KEYWORDS[country];
      const allMarkets: Market[] = [];
      
      // Fetch all markets then filter by country keywords
      for (const [category, tagId] of Object.entries(CATEGORY_TAGS)) {
        const [gamma, data, clob] = await Promise.all([
          fetchGamma(tagId, category),
          fetchDataAPI(tagId, category),
          fetchCLOB(tagId, category)
        ]);
        const { markets } = mergeMarkets(gamma, data, clob);
        allMarkets.push(...markets);
      }
      
      // Filter by country keywords
      const filtered = allMarkets.filter(m => {
        const text = (m.question + ' ' + m.description).toLowerCase();
        return keywords.some(kw => text.includes(kw));
      });
      
      res.status(200).json({
        ok: true,
        country,
        markets: filtered,
        count: filtered.length,
        keywords,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Legacy: allmarkets (flat array)
    if (action === 'allmarkets') {
      const allMarkets: Market[] = [];
      
      for (const [category, tagId] of Object.entries(CATEGORY_TAGS)) {
        const [gamma, data, clob] = await Promise.all([
          fetchGamma(tagId, category),
          fetchDataAPI(tagId, category),
          fetchCLOB(tagId, category)
        ]);
        const { markets } = mergeMarkets(gamma, data, clob);
        allMarkets.push(...markets);
      }

      res.status(200).json({
        ok: true,
        markets: allMarkets,
        count: allMarkets.length,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Legacy: events (geopolitics only)
    if (action === 'events') {
      const [gamma, data, clob] = await Promise.all([
        fetchGamma(100265, 'GEOPOLITICS'),
        fetchDataAPI(100265, 'GEOPOLITICS'),
        fetchCLOB(100265, 'GEOPOLITICS')
      ]);
      const { markets } = mergeMarkets(gamma, data, clob);
      
      res.status(200).json({
        ok: true,
        events: markets.map(m => ({
          id: m.id,
          title: m.question,
          description: m.description,
          markets: [m]
        })),
        count: markets.length,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Anomalies (Agent Signal Stack contract) - derived from the same opportunity pipeline.
    if (action === 'anomalies') {
      const url = getRequestUrl(req);
      const limit = clampInt(url.searchParams.get('limit'), 1, 50, 20);
      const payload = await getWatchlistAnomalies(limit);
      res.status(200).json(payload);
      return;
    }

    // Action: opportunities - New anomaly detection for V2
    if (action === 'opportunities') {
      const url = getRequestUrl(req);
      const limit = clampInt(url.searchParams.get('limit'), 1, 50, 20);
      const payload = await getWatchlistOpportunities(limit);
      res.status(200).json(payload);
      return;
    }

    // Default
    res.status(200).json({
      ok: true,
      message: 'Use action=masterMarkets for multi-API data',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      masterMarkets: {},
      counts: {},
      apiStats: { gamma: 0, data: 0, clob: 0, unique: 0 },
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    });
  }
}
