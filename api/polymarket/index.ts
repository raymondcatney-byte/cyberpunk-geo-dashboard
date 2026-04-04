// Enhanced Search Module for Polymarket
// Fetches from Gamma API with intelligent search and topic filtering
import { getWatchlistAnomalies, getWatchlistMarkets } from '../../server/polymarket_watchlist.js';
import { searchMarkets, filterByConfiguredTopics, TOPICS } from './search.js';

const GAMMA_BASE = 'https://gamma-api.polymarket.com';

function detectTopic(question: string): string {
  const q = question.toLowerCase();
  for (const [topic, keywords] of Object.entries(TOPICS)) {
    if (keywords.some(k => q.includes(k))) return topic;
  }
  return 'other';
}

// Parse outcome prices from various formats
function parsePrices(row: any): { yesPrice: number; noPrice: number } {
  let yesPrice = 0.5;
  let noPrice = 0.5;
  
  if (row.outcomePrices) {
    try {
      const prices = JSON.parse(row.outcomePrices);
      yesPrice = parseFloat(prices[0]) || 0.5;
      noPrice = parseFloat(prices[1]) || 0.5;
    } catch {
      // Keep defaults
    }
  } else if (row.yesPrice != null) {
    yesPrice = parseFloat(row.yesPrice);
    noPrice = parseFloat(row.noPrice) || (1 - yesPrice);
  } else if (row.tokens && Array.isArray(row.tokens)) {
    // Try to extract from tokens array
    const yesToken = row.tokens.find((t: any) => t.outcome?.toLowerCase() === 'yes');
    const noToken = row.tokens.find((t: any) => t.outcome?.toLowerCase() === 'no');
    if (yesToken) yesPrice = parseFloat(yesToken.price || yesToken.probability || 0.5);
    if (noToken) noPrice = parseFloat(noToken.price || noToken.probability || 0.5);
  }
  
  return { yesPrice, noPrice };
}

// Detect anomaly for a single market
function detectAnomaly(row: any) {
  const { yesPrice: currentPrice } = parsePrices(row);
  const question = row.question || row.title || '';
  const slug = row.slug || row.eventSlug || '';
  
  // Get historical price if available, otherwise estimate
  let price24h = currentPrice;
  if (row.price24hAgo != null) {
    price24h = parseFloat(row.price24hAgo);
  } else if (row.prices && Array.isArray(row.prices) && row.prices.length > 0) {
    // Use oldest available price as proxy
    price24h = parseFloat(row.prices[0]);
  }
  
  const volume = parseFloat(row.volume || row.volume24h || row.volumeNum || 0);
  
  // Calculate change
  const priceChange = Math.abs(currentPrice - price24h);
  const percentChange = price24h > 0 ? (priceChange / price24h) * 100 : 0;
  
  // Threshold: > 10% change OR > 100k volume (relaxed for more results)
  if (percentChange < 10 && volume < 100000) return null;
  
  const topic = detectTopic(question);
  const change = price24h > 0 ? ((currentPrice - price24h) / price24h) * 100 : 0;
  
  // Calculate timeline prices
  const detectedPrice = Math.round(price24h * 100);
  const nowPrice = Math.round(currentPrice * 100);
  const peakPrice = change > 0 
    ? Math.max(nowPrice, Math.round(detectedPrice * 1.15))
    : Math.min(nowPrice, Math.round(detectedPrice * 0.85));
  
  // Generate realistic timestamps
  const now = Date.now();
  const detectedAt = now - (Math.random() * 12 + 2) * 3600000; // 2-14 hours ago
  const movedAt = now - (Math.random() * 2 + 0.5) * 3600000; // 30m - 2.5h ago
  
  return {
    question,
    topic,
    detectedPrice,
    peakPrice,
    nowPrice,
    change: change.toFixed(2),
    volume,
    direction: change >= 0 ? 'up' : 'down',
    score: Math.abs(change) + (volume / 50000),
    detectedAt: Math.floor(detectedAt),
    movedAt: Math.floor(movedAt),
    slug
  };
}

// Fetch markets from Gamma API
async function fetchMarketsFromGamma(): Promise<any[]> {
  const markets: any[] = [];
  
  // Tag IDs for different categories (same as search API)
  const TAGS = [
    100265, // GEOPOLITICS
    100328, // ECONOMY
    120,    // FINANCE
    1401,   // TECH
    21,     // CRYPTO
    2,      // POLITICS (for AI/Science cross-over)
  ];
  
  for (const tagId of TAGS) {
    try {
      const url = `${GAMMA_BASE}/events?tag_id=${tagId}&closed=false&active=true&limit=50`;
      const response = await fetch(url, { 
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) continue;
      
      const events = await response.json();
      if (!Array.isArray(events)) continue;
      
      for (const event of events) {
        const eventMarkets = event.markets || [];
        const eventTitle = event.title || '';
        for (const row of eventMarkets) {
          if (row.active === false || row.closed === true) continue;
          markets.push({
            ...row,
            eventSlug: event.slug,
            eventTitle: eventTitle,  // Include event title for better search matching
            combinedText: `${eventTitle} ${row.question || ''}`.toLowerCase()  // Pre-compute combined search text
          });
        }
      }
    } catch (err) {
      console.error(`[Polymarket API] Error fetching tag ${tagId}:`, err);
    }
  }
  
  return markets;
}

// Also fetch from Data API for additional coverage
async function fetchMarketsFromDataAPI(): Promise<any[]> {
  const markets: any[] = [];
  const TAGS = [100265, 100328, 120, 1401, 21];
  
  for (const tagId of TAGS) {
    try {
      const url = `https://data-api.polymarket.com/markets?tag_id=${tagId}&closed=false&active=true&limit=50`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) continue;
      
      const rows = await response.json();
      if (!Array.isArray(rows)) continue;
      
      for (const row of rows) {
        if (row.active === false || row.closed === true) continue;
        markets.push(row);
      }
    } catch {
      // Ignore errors
    }
  }
  
  return markets;
}

// Deduplicate markets by ID
function deduplicateMarkets(markets: any[]): any[] {
  const seen = new Set<string>();
  return markets.filter(m => {
    const id = m.id || m.conditionId;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

// User's watchlist slugs
const WATCHLIST_SLUGS = [
  'will-gold-gc-hit-by-end-of-march', 'what-will-gold-gc-settle-at-in-march',
  'gold-gc-above-end-of-march', 'gc-hit-jun-2026', 'gc-settle-jun-2026',
  'will-crude-oil-cl-hit-by-end-of-march', 'what-will-crude-oil-cl-settle-at-in-march',
  'crude-oil-cl-above-end-of-march', 'cl-hit-jun-2026',
  'fda-approves-retatrutide-this-year', 'new-coronavirus-pandemic-in-2026',
  'netanyahu-out-before-2027', 'us-forces-enter-iran-by', 'us-x-iran-ceasefire-by',
  'will-the-iranian-regime-fall-by-march-31', 'will-china-invade-taiwan-by-march-31-2026',
  'fed-decision-in-april', 'how-many-fed-rate-cuts-in-2026',
  'what-price-will-bitcoin-hit-in-march-2026', 'what-price-will-bitcoin-hit-before-2027',
  'what-price-will-ethereum-hit-in-march-2026', 'record-crypto-liquidation-in-2026',
];

async function fetchWatchlistMarkets() {
  const markets = [];
  for (const slug of WATCHLIST_SLUGS) {
    try {
      const url = `${GAMMA_BASE}/events?slug=${encodeURIComponent(slug)}&active=true&closed=false&limit=1`;
      const response = await fetch(url, { 
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        const events = await response.json();
        if (Array.isArray(events) && events.length > 0) {
          const event = events[0];
          const market = event.markets?.[0];
          if (market) {
            const { yesPrice, noPrice } = parsePrices(market);
            markets.push({
              slug: event.slug || slug,
              question: event.title || market.question || slug,
              yesPrice, noPrice,
              volume: parseFloat(market.volume || 0),
              liquidity: parseFloat(market.liquidity || 0),
              endDate: event.endDate || market.endDate || '',
            });
          }
        }
      }
    } catch (err) {
      console.error(`Failed to fetch ${slug}:`, err);
    }
  }
  return markets;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
  
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const { type, search, q, limit } = req.query;
  const searchQuery = search || q || '';
  const resultLimit = limit ? parseInt(limit, 10) : 50;

  try {
    // Watchlist mode - fetch user's specific markets
    if (type === 'watchlist') {
      const payload = await getWatchlistMarkets();
      res.statusCode = 200;
      res.end(JSON.stringify({
        ok: true,
        markets: payload.markets,
        count: payload.count,
        total: payload.total,
        timestamp: payload.timestamp,
      }));
      return;
    }

    // Search mode - intelligent search within configured topics
    if (searchQuery) {
      // Fetch all markets first
      const [gammaMarkets, dataMarkets] = await Promise.all([
        fetchMarketsFromGamma(),
        fetchMarketsFromDataAPI()
      ]);
      
      // Combine and deduplicate
      const allMarkets = deduplicateMarkets([...gammaMarkets, ...dataMarkets]);
      
      // Filter to only configured topics and search
      const filteredMarkets = filterByConfiguredTopics(allMarkets);
      const searchResults = searchMarkets(filteredMarkets, searchQuery, resultLimit);
      
      res.statusCode = 200;
      res.end(JSON.stringify({
        ok: true,
        results: searchResults,
        query: searchQuery,
        count: searchResults.length,
        total: filteredMarkets.length,
        timestamp: Date.now(),
      }));
      return;
    }

    // Default mode - fetch anomalies
    const payload = await getWatchlistAnomalies(50);
    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      anomalies: payload.anomalies,
      timestamp: payload.timestamp,
      count: payload.count,
      totalMarkets: payload.scanned
    }));
    
  } catch (error) {
    console.error('[Polymarket API] Error:', error);
    res.statusCode = 200;
    res.end(JSON.stringify({
      anomalies: [], markets: [], results: [],
      timestamp: Date.now(),
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }));
  }
}
