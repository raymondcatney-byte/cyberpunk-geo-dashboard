/**
 * GET /api/polymarket/category-markets?category=commodities&limit=10
 * Returns top markets by volume for a specific category
 * Used for category-wide anomaly detection
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GAMMA_BASE = 'https://gamma-api.polymarket.com';

interface GammaMarket {
  id?: string;
  conditionId?: string;
  slug?: string;
  question?: string;
  description?: string;
  category?: string;
  volume?: number;
  liquidity?: number;
  yesPrice?: number;
  noPrice?: number;
  spread?: number;
  endDate?: string;
  expirationDate?: string;
  status?: string;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

// Category mapping from your config to Polymarket tags
const CATEGORY_TAGS: Record<string, string[]> = {
  'geopolitics': ['politics', 'geopolitics', 'war', 'conflict', 'international'],
  'economy': ['economy', 'macro', 'finance', 'fed', 'inflation', 'gdp'],
  'commodities': ['commodities', 'oil', 'gold', 'energy', 'gas'],
  'crypto': ['crypto', 'bitcoin', 'ethereum', 'defi', 'btc', 'eth'],
  'biotech': ['biotech', 'fda', 'health', 'medicine', 'pharma'],
  'ai': ['ai', 'technology', 'tech', 'artificial-intelligence'],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const category = typeof req.query.category === 'string' ? req.query.category.toLowerCase() : '';
  const limit = clampInt(req.query.limit, 1, 20, 10);

  if (!category || !CATEGORY_TAGS[category]) {
    res.status(400).json({
      ok: false,
      error: 'INVALID_CATEGORY',
      validCategories: Object.keys(CATEGORY_TAGS),
    });
    return;
  }

  try {
    // Build tag filter
    const tags = CATEGORY_TAGS[category];
    const tagFilter = tags.map(t => `tag=${encodeURIComponent(t)}`).join('&');
    
    // Fetch active markets from Gamma API
    const url = `${GAMMA_BASE}/events?active=true&closed=false&${tagFilter}&limit=100`;
    
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Gamma API error: ${response.status}`);
    }

    const events = await response.json();
    
    if (!Array.isArray(events)) {
      res.status(200).json({ ok: true, category, markets: [], count: 0 });
      return;
    }

    // Extract markets from events and sort by volume
    const markets = events
      .flatMap((event: any) => {
        const eventMarkets = event.markets || [];
        return eventMarkets.map((m: GammaMarket) => ({
          id: m.conditionId || m.id || '',
          slug: m.slug || '',
          question: m.question || '',
          description: m.description || '',
          category: category.toUpperCase(),
          yesPrice: m.yesPrice || 0,
          noPrice: m.noPrice || 0,
          volume: m.volume || 0,
          liquidity: m.liquidity || 0,
          spread: m.spread || 0,
          endDate: m.endDate || m.expirationDate || '',
          url: `https://polymarket.com/event/${m.slug}`,
        }));
      })
      .filter((m: any) => m.slug && m.volume > 0)
      .sort((a: any, b: any) => b.volume - a.volume)
      .slice(0, limit);

    res.status(200).json({
      ok: true,
      category,
      markets,
      count: markets.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[category-markets] Error:', error);
    res.status(500).json({
      ok: false,
      error: 'FETCH_FAILED',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
