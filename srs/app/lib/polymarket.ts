export type PolymarketMarketResult = {
  id: string;
  question: string;
  slug?: string;
  url?: string;
  yesPrice?: number;
  noPrice?: number;
  endDate?: string;
  category?: string;
  relevanceScore?: number;
  matchingSignals?: string[];
};

type SearchResponse = {
  ok: boolean;
  events?: PolymarketMarketResult[];
  total?: number;
  nextPage?: number;
  error?: string;
};

type EventsResponse = {
  ok: boolean;
  events?: PolymarketMarketResult[];
  error?: string;
};

export async function searchPolymarketMarkets(
  query: string,
  opts?: { limit?: number; page?: number; closed?: boolean; category?: string }
) {
  const limit = typeof opts?.limit === 'number' ? opts.limit : 20;
  const page = typeof opts?.page === 'number' ? opts.page : 1;
  const closed = !!opts?.closed;
  const category = opts?.category;

  const url = new URL('/api/polymarket/search', window.location.origin);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('page', String(page));
  url.searchParams.set('closed', closed ? 'true' : 'false');
  if (category) url.searchParams.set('category', category);

  const r = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`Search request failed (${r.status}).`);

  const data = (await r.json()) as SearchResponse;
  if (!data.ok) throw new Error(data.error || 'SEARCH_FAILED');

  return {
    events: Array.isArray(data.events) ? data.events : [],
    total: typeof data.total === 'number' ? data.total : 0,
    nextPage: typeof data.nextPage === 'number' ? data.nextPage : undefined,
  };
}

export async function getPolymarketMarkets(limit: number = 20, category?: string) {
  const url = new URL('/api/polymarket/events', window.location.origin);
  url.searchParams.set('limit', String(limit));
  if (category) url.searchParams.set('category', category);

  const r = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`Markets request failed (${r.status}).`);

  const data = (await r.json()) as EventsResponse;
  if (!data.ok) throw new Error(data.error || 'MARKETS_FAILED');

  return Array.isArray(data.events) ? data.events : [];
}

export type PolymarketMarketDetail = {
  id: string;
  question: string;
  description: string;
  slug: string;
  category: string;
  tags: string[];
  endDate: string;
  status: 'active' | 'closed' | 'resolved' | 'cancelled';
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  spread: number;
  createdAt: string;
  resolutionSource?: string;
  icon?: string;
  outcomes: string[];
  outcomePrices: number[];
};

type MarketDetailResponse = {
  ok: boolean;
  market?: PolymarketMarketDetail;
  error?: string;
};

export async function getPolymarketMarketDetail(id?: string, slug?: string): Promise<PolymarketMarketDetail> {
  if (!id && !slug) throw new Error('Provide either id or slug.');

  const url = new URL('/api/polymarket/market', window.location.origin);
  if (id) url.searchParams.set('id', id);
  if (slug) url.searchParams.set('slug', slug);

  const r = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`Market detail request failed (${r.status}).`);

  const data = (await r.json()) as MarketDetailResponse;
  if (!data.ok) throw new Error(data.error || 'MARKET_DETAIL_FAILED');
  if (!data.market) throw new Error('MARKET_NOT_FOUND');

  return data.market;
}