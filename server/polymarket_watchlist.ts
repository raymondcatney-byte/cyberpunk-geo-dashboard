import { POLYMARKET_WATCHLIST, type WatchlistMarket } from '../srs/config/polymarketWatchlist.js';

const GAMMA_BASE = 'https://gamma-api.polymarket.com';

export type WatchlistMarketStatus = 'active' | 'closed' | 'resolved' | 'missing';
export type WatchlistOutcome = 'YES' | 'NO' | 'CANCELLED' | 'UNKNOWN';
export type AnomalyType = 'volume_spike' | 'price_swing' | 'volume_accel' | 'liquidity' | 'smart_money';
export type CommsCategory = 'GEOPOLITICS' | 'AI' | 'DeFi' | 'MACRO' | 'ENERGY_COMMODITIES' | 'BIOTECH';

export type NormalizedWatchlistMarket = {
  id: string;
  slug: string;
  question: string;
  description: string;
  displayName: string;
  category: string;
  sourceCategory: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  endDate: string;
  url: string;
  status: WatchlistMarketStatus;
  outcome?: WatchlistOutcome;
  resolvedAt?: string;
  updatedAt: string;
  error?: string;
  aliases: string[];
};

export type WatchlistOpportunity = {
  market: {
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
  };
  anomalies: AnomalyType[];
  compositeScore: number;
};

type CommsMasterMarkets = Record<CommsCategory, NormalizedWatchlistMarket[]>;

type GammaMarketRecord = Record<string, unknown>;

const COMMS_CATEGORIES: CommsCategory[] = ['GEOPOLITICS', 'AI', 'DeFi', 'MACRO', 'ENERGY_COMMODITIES', 'BIOTECH'];

const WATCHLIST_CATEGORY_ALIASES: Record<string, CommsCategory | null> = {
  geopolitics: 'GEOPOLITICS',
  economy: 'MACRO',
  macro: 'MACRO',
  commodities: 'ENERGY_COMMODITIES',
  biotech: 'BIOTECH',
  crypto: 'DeFi',
  ai: 'AI',
  science: null,
};

const CATEGORY_DISCOVERY: Record<CommsCategory, { terms: string[]; blocked?: string[] }> = {
  GEOPOLITICS: {
    terms: ['iran', 'taiwan', 'china', 'israel', 'gaza', 'netanyahu', 'ukraine', 'russia', 'ceasefire', 'sanctions'],
    blocked: ['election', 'vote', 'president', 'senate', 'candidate', 'campaign', 'trump', 'biden', 'harris'],
  },
  AI: {
    terms: ['openai', 'chatgpt', 'anthropic', 'claude', 'ai', 'artificial intelligence', 'nvidia', 'llm'],
    blocked: ['election', 'vote', 'president'],
  },
  DeFi: {
    terms: ['bitcoin', 'ethereum', 'btc', 'eth', 'crypto', 'defi', 'solana', 'liquidation', 'stablecoin'],
    blocked: ['election', 'vote', 'president'],
  },
  MACRO: {
    terms: ['fed', 'rate cut', 'rates', 'inflation', 'cpi', 'fomc', 'economy', 'recession', 'gdp'],
    blocked: ['stock split', 'earnings', 'trump', 'biden', 'election', 'candidate', 'campaign'],
  },
  ENERGY_COMMODITIES: {
    terms: ['gold', 'gc', 'oil', 'crude', 'cl', 'wti', 'brent', 'natural gas', 'commodity', 'copper'],
    blocked: ['election', 'vote', 'president', 'candidate'],
  },
  BIOTECH: {
    terms: ['fda', 'drug', 'clinical trial', 'phase 3', 'therapy', 'vaccine', 'biotech', 'pharma', 'retatrutide'],
    blocked: ['election', 'vote', 'president', 'senate', 'campaign', 'candidate', 'trump', 'biden'],
  },
};

const SEARCH_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'will', 'what', 'when', 'where', 'which',
  'about', 'over', 'under', 'after', 'before', 'than', 'into', 'market', 'markets', 'prediction',
  'predictions', 'bet', 'bets', 'show', 'find', 'scan', 'signal', 'signals', 'priced', 'price'
]);

const MAX_DISCOVERY_RESULTS = 8;

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timer),
  };
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return '';
}

function parseNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseArrayField(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item));
  } catch {
    return value.split(',').map((part) => part.trim()).filter(Boolean);
  }
  return [];
}

function normalizeOutcome(value: unknown): WatchlistOutcome | undefined {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'YES' || raw === 'NO' || raw === 'CANCELLED' || raw === 'UNKNOWN') return raw;
  return undefined;
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeQuery(value: string) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !SEARCH_STOPWORDS.has(token));
}

function getYesNoPrices(row: Record<string, unknown>) {
  const outcomes = parseArrayField(row.outcomes).map((item) => item.toLowerCase());
  const outcomePrices = parseArrayField(row.outcomePrices).map((item) => Number(item));
  let yesPrice = parseNumber(row.yesPrice, 0.5);
  let noPrice = parseNumber(row.noPrice, 1 - yesPrice);

  if (outcomes.length && outcomePrices.length) {
    const yesIndex = outcomes.findIndex((item) => item === 'yes');
    const noIndex = outcomes.findIndex((item) => item === 'no');
    if (yesIndex >= 0 && Number.isFinite(outcomePrices[yesIndex])) yesPrice = outcomePrices[yesIndex]!;
    if (noIndex >= 0 && Number.isFinite(outcomePrices[noIndex])) noPrice = outcomePrices[noIndex]!;
  }

  return { yesPrice, noPrice };
}

async function fetchJson(url: string, timeoutMs = 8000) {
  const { signal, cancel } = withTimeout(timeoutMs);
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal });
    if (!response.ok) throw new Error(`UPSTREAM_${response.status}`);
    return await response.json();
  } finally {
    cancel();
  }
}

function toCommsCategory(rawCategory: string): CommsCategory | null {
  const normalized = normalizeText(rawCategory);
  if (!normalized) return null;
  return WATCHLIST_CATEGORY_ALIASES[normalized] ?? null;
}

function buildAliases(entry: { slug: string; displayName: string; question?: string; description?: string; category: string; sourceCategory: string }) {
  const pieces = [
    entry.slug.replace(/-/g, ' '),
    entry.displayName,
    entry.question || '',
    entry.description || '',
    entry.category,
    entry.sourceCategory,
  ];
  return Array.from(new Set(
    pieces
      .flatMap((piece) => tokenizeQuery(piece))
      .filter(Boolean)
  ));
}

function toMissingMarket(entry: WatchlistMarket, error = 'MISSING'): NormalizedWatchlistMarket {
  const mappedCategory = toCommsCategory(entry.category);
  const category = mappedCategory ?? entry.category.toUpperCase();
  return {
    id: entry.slug,
    slug: entry.slug,
    question: entry.displayName,
    description: '',
    displayName: entry.displayName,
    category,
    sourceCategory: entry.category,
    yesPrice: 0,
    noPrice: 0,
    volume: 0,
    liquidity: 0,
    endDate: '',
    url: `https://polymarket.com/event/${entry.slug}`,
    status: 'missing',
    outcome: 'UNKNOWN',
    updatedAt: new Date().toISOString(),
    error,
    aliases: buildAliases({
      slug: entry.slug,
      displayName: entry.displayName,
      category,
      sourceCategory: entry.category,
    }),
  };
}

function normalizeGammaRecord(
  row: GammaMarketRecord,
  options: { slug: string; displayName: string; sourceCategory: string; category: CommsCategory }
): NormalizedWatchlistMarket {
  const { yesPrice, noPrice } = getYesNoPrices(row);
  const question = firstString(row.question, row.title, options.displayName) || options.displayName;
  const description = firstString(row.description);
  const resolvedAt = firstString(row.resolvedAt);
  const outcome =
    normalizeOutcome(row.resolution) ??
    normalizeOutcome(row.outcome) ??
    normalizeOutcome(row.winningOutcome);
  const closed = row.closed === true;
  const status: WatchlistMarketStatus = resolvedAt || outcome
    ? 'resolved'
    : closed
    ? 'closed'
    : 'active';

  const aliases = buildAliases({
    slug: options.slug,
    displayName: options.displayName,
    question,
    description,
    category: options.category,
    sourceCategory: options.sourceCategory,
  });

  return {
    id: String((row.id ?? row.conditionId ?? options.slug) || options.slug),
    slug: options.slug,
    question,
    description,
    displayName: options.displayName,
    category: options.category,
    sourceCategory: options.sourceCategory,
    yesPrice,
    noPrice,
    volume: parseNumber(row.volume, parseNumber(row.volumeNum, 0)),
    liquidity: parseNumber(row.liquidity, parseNumber(row.liquidityNum, 0)),
    endDate: firstString(row.endDate, row.expirationDate),
    url: `https://polymarket.com/event/${options.slug}`,
    status,
    outcome: outcome ?? (status === 'resolved' ? 'UNKNOWN' : undefined),
    resolvedAt: resolvedAt || undefined,
    updatedAt: new Date().toISOString(),
    aliases,
  };
}

async function fetchWatchlistEntry(entry: WatchlistMarket): Promise<NormalizedWatchlistMarket> {
  const mappedCategory = toCommsCategory(entry.category);
  if (!mappedCategory) {
    return toMissingMarket(entry, 'UNMAPPED_CATEGORY');
  }

  try {
    const events = await fetchJson(`${GAMMA_BASE}/events?slug=${encodeURIComponent(entry.slug)}&limit=10`, 9000);
    if (!Array.isArray(events) || events.length === 0) return toMissingMarket(entry, 'NOT_FOUND');

    const event =
      events.find((item) => firstString((item as any)?.slug).toLowerCase() === entry.slug.toLowerCase()) ??
      events[0];
    const marketRow =
      Array.isArray((event as any)?.markets) && (event as any).markets.length > 0
        ? (event as any).markets[0]
        : null;

    if (!marketRow || typeof marketRow !== 'object') return toMissingMarket(entry, 'NO_MARKET');

    return normalizeGammaRecord(marketRow as GammaMarketRecord, {
      slug: entry.slug,
      displayName: entry.displayName,
      sourceCategory: entry.category,
      category: mappedCategory,
    });
  } catch (error) {
    return toMissingMarket(entry, error instanceof Error ? error.message : 'FETCH_FAILED');
  }
}

export async function getWatchlistMarkets() {
  const settled = await Promise.all(POLYMARKET_WATCHLIST.map((entry) => fetchWatchlistEntry(entry)));
  return {
    markets: settled,
    count: settled.filter((market) => market.status !== 'missing').length,
    total: settled.length,
    timestamp: new Date().toISOString(),
  };
}

function matchesDiscoveryCategory(record: GammaMarketRecord, category: CommsCategory) {
  const config = CATEGORY_DISCOVERY[category];
  const text = normalizeText([record.question, record.title, record.description, record.slug].join(' '));
  if (!text) return false;
  if (config.blocked?.some((term) => text.includes(normalizeText(term)))) return false;
  return config.terms.some((term) => text.includes(normalizeText(term)));
}

async function fetchCategoryDiscovery(category: CommsCategory): Promise<NormalizedWatchlistMarket[]> {
  const config = CATEGORY_DISCOVERY[category];
  const response = await fetchJson(`${GAMMA_BASE}/markets?active=true&closed=false&limit=200`, 9000).catch(() => []);
  const rows = Array.isArray(response) ? response : [];
  const deduped = new Map<string, NormalizedWatchlistMarket>();

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row as GammaMarketRecord;
    if (!matchesDiscoveryCategory(record, category)) continue;

    const slug = firstString(record.slug, record.conditionId, record.id);
    const question = firstString(record.question, record.title);
    if (!slug || !question) continue;

    const normalized = normalizeGammaRecord(record, {
      slug,
      displayName: question,
      sourceCategory: 'discovery',
      category,
    });
    if (normalized.status !== 'active') continue;

    const key = normalized.slug || normalized.id;
    const existing = deduped.get(key);
    if (!existing || normalized.liquidity > existing.liquidity) {
      deduped.set(key, normalized);
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => {
      if (b.liquidity !== a.liquidity) return b.liquidity - a.liquidity;
      return b.volume - a.volume;
    })
    .slice(0, MAX_DISCOVERY_RESULTS);
}

function createEmptyMasterMarkets(): CommsMasterMarkets {
  return {
    GEOPOLITICS: [],
    AI: [],
    DeFi: [],
    MACRO: [],
    ENERGY_COMMODITIES: [],
    BIOTECH: [],
  };
}

export async function getCommsMasterMarkets() {
  const snapshot = await getWatchlistMarkets();
  const masterMarkets = createEmptyMasterMarkets();
  const quarantined: NormalizedWatchlistMarket[] = [];

  for (const market of snapshot.markets) {
    const category = COMMS_CATEGORIES.includes(market.category as CommsCategory)
      ? (market.category as CommsCategory)
      : null;
    if (!category || market.status === 'missing') {
      quarantined.push(market);
      continue;
    }
    masterMarkets[category].push(market);
  }

  for (const category of COMMS_CATEGORIES) {
    if (masterMarkets[category].length === 0) {
      const fallback = await fetchCategoryDiscovery(category).catch(() => []);
      masterMarkets[category] = fallback;
    } else {
      masterMarkets[category] = masterMarkets[category]
        .sort((a, b) => {
          if (a.sourceCategory !== b.sourceCategory) {
            if (a.sourceCategory === 'discovery') return 1;
            if (b.sourceCategory === 'discovery') return -1;
          }
          if (b.liquidity !== a.liquidity) return b.liquidity - a.liquidity;
          return b.volume - a.volume;
        });
    }
  }

  return {
    ok: true as const,
    masterMarkets,
    counts: Object.fromEntries(COMMS_CATEGORIES.map((category) => [category, masterMarkets[category].length])) as Record<CommsCategory, number>,
    apiStats: {
      watchlist: snapshot.count,
      discovery: Object.values(masterMarkets).flat().filter((market) => market.sourceCategory === 'discovery').length,
      quarantined: quarantined.length,
      unique: Object.values(masterMarkets).flat().length,
    },
    timestamp: snapshot.timestamp,
  };
}

function scoreCommsMarket(market: NormalizedWatchlistMarket, query: string, queryTokens: string[]) {
  const question = normalizeText(market.question);
  const description = normalizeText(market.description);
  const slug = normalizeText(market.slug);
  const category = normalizeText(market.category);
  const aliasText = market.aliases.map(normalizeText);

  let score = 0;

  if (question === query || slug === query) score += 140;
  else if (question.includes(query)) score += 70;
  else if (slug.includes(query)) score += 55;

  for (const token of queryTokens) {
    if (question.includes(token)) score += 28;
    else if (slug.includes(token)) score += 24;
    else if (aliasText.some((alias) => alias.includes(token))) score += 18;
    else if (description.includes(token) || category.includes(token)) score += 10;
  }

  if (queryTokens.length > 1 && queryTokens.every((token) => question.includes(token) || slug.includes(token) || aliasText.some((alias) => alias.includes(token)))) {
    score += 25;
  }

  if (market.sourceCategory !== 'discovery') score += 15;
  if (market.liquidity > 1_000_000) score += 8;
  else if (market.liquidity > 100_000) score += 4;
  if (market.volume > 500_000) score += 6;
  if (market.status === 'active') score += 5;

  return score;
}

export async function searchCommsMarkets(query: string, category?: string, limit = 20) {
  const normalizedQuery = normalizeText(query);
  const tokens = tokenizeQuery(query);
  const payload = await getCommsMasterMarkets();
  const requestedCategory = category && COMMS_CATEGORIES.includes(category as CommsCategory)
    ? (category as CommsCategory)
    : null;
  const markets = requestedCategory
    ? payload.masterMarkets[requestedCategory]
    : Object.values(payload.masterMarkets).flat();

  const scored = markets
    .map((market) => ({ market, score: scoreCommsMarket(market, normalizedQuery, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.market.liquidity - a.market.liquidity)
    .slice(0, limit)
    .map((entry) => ({
      id: entry.market.id,
      question: entry.market.question,
      slug: entry.market.slug,
      url: entry.market.url,
      yesPrice: entry.market.yesPrice,
      noPrice: entry.market.noPrice,
      endDate: entry.market.endDate,
      category: entry.market.category,
      relevanceScore: entry.score,
      matchingSignals: entry.market.aliases.slice(0, 4),
      description: entry.market.description,
      volume: entry.market.volume,
      liquidity: entry.market.liquidity,
      sourceCategory: entry.market.sourceCategory,
      status: entry.market.status,
    }));

  return {
    ok: true as const,
    events: scored,
    total: scored.length,
    nextPage: undefined,
    timestamp: payload.timestamp,
  };
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]) {
  if (!values.length) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export function buildWatchlistOpportunities(markets: NormalizedWatchlistMarket[]): WatchlistOpportunity[] {
  const activeMarkets = markets.filter((market) => market.status === 'active');
  if (!activeMarkets.length) return [];

  const volumes = activeMarkets.map((market) => market.volume);
  const avgVolume = mean(volumes);
  const volumeStd = stdDev(volumes);

  return activeMarkets.map((market) => {
    const anomalies: AnomalyType[] = [];
    const volumeZ = volumeStd > 0 ? (market.volume - avgVolume) / volumeStd : 0;
    if (volumeZ > 1.5) anomalies.push('volume_spike');

    const priceChange = Math.abs(market.yesPrice - 0.5);
    if (priceChange > 0.1) anomalies.push('price_swing');

    const volumeAccel = avgVolume > 0 ? market.volume / avgVolume : 0;
    if (volumeAccel > 2.5) anomalies.push('volume_accel');

    const spread = Math.abs(market.yesPrice - (1 - market.noPrice));
    if (spread < 0.05 && market.volume >= avgVolume) anomalies.push('liquidity');

    if (market.volume >= avgVolume && spread < 0.05 && priceChange > 0.08) anomalies.push('smart_money');

    let compositeScore = 0;
    compositeScore += Math.max(0, volumeZ) * 18;
    compositeScore += priceChange * 100 * 0.5;
    compositeScore += Math.max(0, volumeAccel - 1) * 8;
    if (anomalies.includes('liquidity')) compositeScore += 12;
    if (anomalies.includes('smart_money')) compositeScore += 20;

    return {
      market: {
        id: market.id,
        question: market.question,
        description: market.description || `${market.category} watchlist market`,
        slug: market.slug,
        category: market.category,
        yesPrice: market.yesPrice,
        noPrice: market.noPrice,
        volume: market.volume,
        liquidity: market.liquidity,
        endDate: market.endDate,
        url: market.url,
      },
      anomalies,
      compositeScore: Math.min(100, Math.max(0, Math.round(compositeScore))),
    };
  }).sort((a, b) => b.compositeScore - a.compositeScore);
}

export async function getWatchlistOpportunities(limit = 20) {
  const snapshot = await getWatchlistMarkets();
  const opportunities = buildWatchlistOpportunities(snapshot.markets).slice(0, limit);
  return {
    ok: true as const,
    opportunities,
    count: opportunities.length,
    scanned: snapshot.count,
    timestamp: snapshot.timestamp,
  };
}

export async function getWatchlistAnomalies(limit = 20) {
  const snapshot = await getWatchlistMarkets();
  const opportunities = buildWatchlistOpportunities(snapshot.markets).slice(0, limit);
  const timestamp = snapshot.timestamp;

  const anomalies = opportunities.map((opp) => ({
    id: opp.market.id,
    sector: opp.market.category || 'unknown',
    title: opp.market.question,
    slug: opp.market.slug,
    score: Math.min(100, Math.max(0, Math.round(opp.compositeScore))),
    price: opp.market.yesPrice,
    volume: opp.market.volume,
    volumeZ: 0,
    priceChange1h: 0,
    priceChange24h: 0,
    signals: opp.anomalies.map((item) => String(item)),
    url: opp.market.url,
    timestamp,
  }));

  return {
    ok: true as const,
    anomalies,
    count: anomalies.length,
    scanned: snapshot.count,
    timestamp,
  };
}
