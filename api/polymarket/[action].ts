// GET /api/polymarket/events?limit=20&category=politics
// GET /api/polymarket/search?q=<query>&limit=20&page=1&closed=false
// GET /api/polymarket/market?id=<id> or ?slug=<slug>
import { getCommsMasterMarkets, getWatchlistMarkets, searchCommsMarkets } from '../../server/polymarket_watchlist.js';

const GAMMA_BASE = 'https://gamma-api.polymarket.com';

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

const SEARCH_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'will', 'what', 'when', 'where', 'which', 'into',
  'about', 'over', 'under', 'after', 'before', 'than', 'have', 'has', 'had', 'your', 'their', 'market',
  'markets', 'prediction', 'predictions', 'bet', 'bets', 'price', 'priced', 'against', 'across',
]);

const TOPIC_SYNONYMS: Record<string, string[]> = {
  ai: ['artificial intelligence', 'openai', 'anthropic', 'nvidia', 'model'],
  biotech: ['drug', 'fda', 'nih', 'trial', 'pharma', 'therapy'],
  energy: ['oil', 'gas', 'power', 'electricity', 'grid', 'renewable'],
  crypto: ['bitcoin', 'ethereum', 'solana', 'defi', 'btc', 'eth'],
  geopolitics: ['war', 'conflict', 'sanctions', 'china', 'taiwan', 'iran', 'ukraine', 'israel'],
  macro: ['fed', 'inflation', 'cpi', 'recession', 'rates', 'gdp'],
};

function withTimeout(ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(id) };
}

function parseArrayField(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v));
    } catch {
      return value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function normalizeSlug(slug: string): string {
  return decodeURIComponent(slug)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')   // Normalize special chars to hyphens
    .replace(/-+/g, '-')            // Collapse multiple hyphens
    .replace(/^-|-$/g, '');         // Trim leading/trailing hyphens
}

function parseNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeMarketRow(row: any) {
  const outcomes = parseArrayField(row?.outcomes);
  const outcomePrices = parseArrayField(row?.outcomePrices).map((p) => Number(p));
  const yesIndex = outcomes.findIndex((o) => o.toLowerCase() === 'yes');
  const noIndex = outcomes.findIndex((o) => o.toLowerCase() === 'no');

  const yesPrice = yesIndex >= 0 ? outcomePrices[yesIndex] : outcomePrices[0];
  const noPrice = noIndex >= 0 ? outcomePrices[noIndex] : outcomePrices[1];

  return {
    id: String(row?.id ?? '') || (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now())),
    question: String(row?.question ?? 'Untitled market'),
    slug: row?.slug ? String(row.slug) : undefined,
    yesPrice: Number.isFinite(yesPrice) ? yesPrice : undefined,
    noPrice: Number.isFinite(noPrice) ? noPrice : undefined,
    endDate: row?.endDate ? String(row.endDate) : undefined,
    category: row?.category ? String(row.category) : undefined,
    relevanceScore: row?.relevanceScore ? Number(row.relevanceScore) : undefined,
    matchingSignals: Array.isArray(row?.matchingSignals) ? row.matchingSignals.map((signal: unknown) => String(signal)) : undefined,
  };
}

function extractOutcomeData(record: Record<string, unknown>) {
  const directOutcomes = parseArrayField(record.outcomes);
  const directOutcomePrices = parseArrayField(record.outcomePrices).map((p) => Number(p));

  if (directOutcomes.length || directOutcomePrices.length) {
    return { outcomes: directOutcomes, outcomePrices: directOutcomePrices };
  }

  const tokens = Array.isArray(record.tokens) ? record.tokens : [];
  if (tokens.length) {
    const outcomes = tokens
      .map((token) =>
        isRecord(token)
          ? firstString(token.outcome, token.name, token.label, token.tokenName)
          : undefined
      )
      .filter((value): value is string => !!value);
    const outcomePrices = tokens
      .map((token) =>
        isRecord(token)
          ? parseNumber(token.price) ??
            parseNumber(token.lastPrice) ??
            parseNumber(token.probability)
          : undefined
      )
      .filter((value): value is number => Number.isFinite(value));

    if (outcomes.length || outcomePrices.length) {
      return { outcomes, outcomePrices };
    }
  }

  return { outcomes: [], outcomePrices: [] as number[] };
}

function extractTags(record: Record<string, unknown>): string[] {
  // Check if tags is an array of objects (Polymarket format: [{ slug: "...", name: "..." }])
  if (Array.isArray(record.tags) && record.tags.length > 0 && typeof record.tags[0] === 'object') {
    return record.tags
      .map((tag: any) => {
        if (typeof tag === 'string') return tag;
        if (tag && typeof tag === 'object') {
          return tag.slug || tag.name || tag.label || null;
        }
        return null;
      })
      .filter(Boolean) as string[];
  }

  // Handle string arrays or stringified JSON
  const direct = parseArrayField(record.tags);
  if (direct.length) return direct;

  // Fallback to tagSlugs
  const tagObjects = Array.isArray(record.tagSlugs) ? record.tagSlugs : [];
  return tagObjects
    .map((tag) => {
      if (typeof tag === 'string') return tag;
      if (isRecord(tag)) return firstString(tag.slug, tag.name, tag.label);
      return undefined;
    })
    .filter((value): value is string => !!value);
}

interface MarketDetail {
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
}

function normalizeMarketDetail(row: unknown): MarketDetail {
  if (!isRecord(row)) {
    throw new Error('UNSUPPORTED_UPSTREAM_SHAPE');
  }

  const r = row;
  const { outcomes, outcomePrices } = extractOutcomeData(r);
  const yesIndex = outcomes.findIndex((o) => o.toLowerCase() === 'yes');
  const noIndex = outcomes.findIndex((o) => o.toLowerCase() === 'no');
  const yesPrice = yesIndex >= 0 ? outcomePrices[yesIndex] : outcomePrices[0];
  const noPrice = noIndex >= 0 ? outcomePrices[noIndex] : outcomePrices[1];
  const rawStatus = String(r?.active ?? r?.status ?? 'active').toLowerCase();
  const closed = r?.closed === true || r?.closed === 'true';
  const resolved = r?.resolved === true || r?.resolved === 'true';

  let status: MarketDetail['status'] = 'active';
  if (resolved) status = 'resolved';
  else if (closed) status = 'closed';
  else if (rawStatus === 'cancelled') status = 'cancelled';

  const question = firstString(r.question, r.title, r.name);
  if (!question) {
    throw new Error('UNSUPPORTED_UPSTREAM_SHAPE');
  }

  return {
    id: String(r?.id ?? r?.conditionId ?? ''),
    question,
    description: firstString(r.description, r.rules, r.subtitle, r.comment) ?? 'No description available.',
    slug: firstString(r.slug) ?? '',
    category: firstString(r.category, r.series, r.groupItemTitle) ?? 'Uncategorized',
    tags: extractTags(r),
    endDate: firstString(r.endDate, r.expirationDate, r.resolveDate) ?? '',
    status,
    yesPrice: Number.isFinite(yesPrice) ? yesPrice : 0,
    noPrice: Number.isFinite(noPrice) ? noPrice : 0,
    volume: parseNumber(r?.volume) ?? parseNumber(r?.volumeNum) ?? 0,
    liquidity: parseNumber(r?.liquidity) ?? parseNumber(r?.liquidityNum) ?? 0,
    spread: parseNumber(r?.spread) ?? Math.abs((yesPrice ?? 0) - (1 - (noPrice ?? 0))),
    createdAt: String(r?.createdAt ?? r?.startDate ?? ''),
    resolutionSource: r?.resolutionSource ? String(r.resolutionSource) : undefined,
    icon: r?.icon ? String(r.icon) : undefined,
    outcomes,
    outcomePrices,
  };
}

async function fetchJson(url: string, signal: AbortSignal) {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal });
  if (!response.ok) {
    throw new Error(`UPSTREAM_${response.status}`);
  }
  return response.json();
}

async function fetchMarketsPage(params: { offset: number; limit: number; closed: boolean }) {
  const url = new URL(`${GAMMA_BASE}/markets`);
  url.searchParams.set('limit', String(params.limit));
  url.searchParams.set('offset', String(params.offset));
  url.searchParams.set('closed', params.closed ? 'true' : 'false');

  const { signal, cancel } = withTimeout(8000);
  try {
    const r = await fetch(url.toString(), { headers: { Accept: 'application/json' }, signal });
    if (!r.ok) throw new Error(`UPSTREAM_${r.status}`);
    const data = (await r.json()) as unknown;
    return Array.isArray(data) ? (data as any[]) : Array.isArray((data as any)?.markets) ? ((data as any).markets as any[]) : [];
  } finally {
    cancel();
  }
}

function scoreSearchRow(row: any, query: string, queryTokens: string[]) {
  const question = normalizeText(row?.question);
  const slug = normalizeText(row?.slug);
  const description = normalizeText(row?.description);
  const category = normalizeText(row?.category);
  const tags = parseArrayField(row?.tags).map(normalizeText).filter(Boolean);
  const fullText = [question, slug, description, category, ...tags].join(' ').trim();

  if (!fullText) return null;

  let score = 0;
  const matchingSignals = new Set<string>();

  if (question === query) {
    score += 180;
    matchingSignals.add('exact question match');
  } else if (question.startsWith(query)) {
    score += 120;
    matchingSignals.add('question prefix');
  } else if (new RegExp(`\\b${escapeRegExp(query)}\\b`).test(question)) {
    score += 90;
    matchingSignals.add('exact phrase in question');
  } else if (question.includes(query)) {
    score += 60;
    matchingSignals.add('question contains phrase');
  }

  if (slug === query) {
    score += 90;
    matchingSignals.add('exact slug match');
  } else if (slug.includes(query)) {
    score += 35;
    matchingSignals.add('slug overlap');
  }

  let tokenHits = 0;
  let titleTokenHits = 0;
  for (const token of queryTokens) {
    const tokenPattern = new RegExp(`\\b${escapeRegExp(token)}\\b`);
    if (tokenPattern.test(question)) {
      score += 24;
      tokenHits += 1;
      titleTokenHits += 1;
      matchingSignals.add(`title:${token}`);
    } else if (tokenPattern.test(category) || tags.some((tag) => tokenPattern.test(tag))) {
      score += 16;
      tokenHits += 1;
      matchingSignals.add(`tag:${token}`);
    } else if (tokenPattern.test(description) || tokenPattern.test(slug)) {
      score += 9;
      tokenHits += 1;
      matchingSignals.add(`context:${token}`);
    }
  }

  if (queryTokens.length > 1 && tokenHits === queryTokens.length) {
    score += 30;
    matchingSignals.add('all query tokens matched');
  }

  const synonymHits = new Set<string>();
  for (const token of queryTokens) {
    const synonyms = TOPIC_SYNONYMS[token] || [];
    for (const synonym of synonyms) {
      const normalizedSynonym = normalizeText(synonym);
      if (normalizedSynonym && fullText.includes(normalizedSynonym)) {
        score += 10;
        synonymHits.add(synonym);
      }
    }
  }
  for (const synonym of synonymHits) {
    matchingSignals.add(`theme:${synonym}`);
  }

  const liquidity = Number(row?.liquidity) || 0;
  const volume = Number(row?.volume) || 0;
  const endDate = row?.endDate ? new Date(String(row.endDate)) : null;
  const daysUntilClose = endDate ? (endDate.getTime() - Date.now()) / 86_400_000 : 365;

  if (daysUntilClose > 0 && daysUntilClose <= 45) {
    score += 10;
    matchingSignals.add('near-term catalyst window');
  } else if (daysUntilClose > 45 && daysUntilClose <= 120) {
    score += 4;
  } else if (daysUntilClose < 0 || daysUntilClose > 365) {
    score -= 12;
  }

  if (liquidity > 1_000_000) score += 8;
  else if (liquidity > 250_000) score += 5;
  else if (liquidity > 50_000) score += 2;

  if (volume > 2_000_000) score += 8;
  else if (volume > 500_000) score += 5;
  else if (volume > 100_000) score += 2;

  const status = String(row?.status ?? '').toLowerCase();
  if (status === 'active') score += 6;

  return score > 0
    ? {
        row: {
          ...row,
          relevanceScore: Math.round(score),
          matchingSignals: Array.from(matchingSignals).slice(0, 4),
        },
        score,
        titleTokenHits,
        liquidity,
      }
    : null;
}

function extractMarketCandidates(payload: unknown): Record<string, unknown>[] {
  const queue = Array.isArray(payload) ? [...payload] : payload ? [payload] : [];
  const candidates: Record<string, unknown>[] = [];

  while (queue.length) {
    const current = queue.shift();
    if (!isRecord(current)) continue;

    const maybeQuestion = firstString(current.question, current.title, current.name);
    const directMarketId = firstString(current.id, current.conditionId, current.marketId);
    const hasOutcomeData =
      parseArrayField(current.outcomes).length > 0 ||
      parseArrayField(current.outcomePrices).length > 0 ||
      (Array.isArray(current.tokens) && current.tokens.length > 0);

    if ((maybeQuestion && hasOutcomeData) || (directMarketId && hasOutcomeData)) {
      candidates.push(current);
    }

    if (Array.isArray(current.markets)) queue.push(...current.markets);
    if (Array.isArray(current.events)) queue.push(...current.events);
    if (isRecord(current.market)) queue.push(current.market);
  }

  return candidates;
}

function extractMarketIdFromPayload(payload: unknown, slug?: string): string | undefined {
  const candidates = extractMarketCandidates(payload);
  const matchingCandidate =
    candidates.find((candidate) => {
      const candidateSlug = firstString(candidate.slug);
      if (!candidateSlug || !slug) return false;
      return normalizeSlug(candidateSlug) === normalizeSlug(slug);
    }) ??
    candidates[0];

  return firstString(
    matchingCandidate?.id,
    matchingCandidate?.conditionId,
    matchingCandidate?.marketId
  );
}

export default async function handler(req: { method?: string; query?: Record<string, string> }, res: { statusCode: number; setHeader: (key: string, value: string) => void; end: (body: string) => void }) {
  const action = typeof req.query?.action === 'string' ? req.query.action.trim().toLowerCase() : '';

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'METHOD_NOT_ALLOWED' }));
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');

  try {
    if (action === 'watchlist') {
      const payload = await getWatchlistMarkets();
      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, ...payload }));
      return;
    }

    if (action === 'events') {
      const limit = clampInt(req.query?.limit, 1, 50, 20);
      const category = typeof req.query?.category === 'string' ? req.query.category.trim() : '';
      const payload = await getCommsMasterMarkets();
      const events = (category ? (payload.masterMarkets as Record<string, any[]>)[category] || [] : Object.values(payload.masterMarkets).flat())
        .slice(0, limit)
        .map((market) => ({
          id: market.id,
          question: market.question,
          slug: market.slug,
          url: market.url,
          yesPrice: market.yesPrice,
          noPrice: market.noPrice,
          endDate: market.endDate,
          category: market.category,
          relevanceScore: undefined,
          matchingSignals: market.aliases?.slice(0, 4),
          sourceCategory: market.sourceCategory,
          volume: market.volume,
          liquidity: market.liquidity,
        }));

      res.statusCode = 200;
      res.end(JSON.stringify({ ok: true, events }));
      return;
    }

    if (action === 'search') {
      const qRaw = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
      if (qRaw.length < 2 || qRaw.length > 80) {
        res.statusCode = 400;
        res.end(JSON.stringify({ ok: false, error: 'INVALID_QUERY' }));
        return;
      }

      const limit = clampInt(req.query?.limit, 1, 50, 20);
      const category = typeof req.query?.category === 'string' ? req.query.category.trim() : '';
      const payload = await searchCommsMarkets(qRaw, category || undefined, limit);
      res.statusCode = 200;
      res.end(JSON.stringify(payload));
      return;
    }

    if (action === 'market') {
      const id = typeof req.query?.id === 'string' ? req.query.id.trim() : '';
      const slug = typeof req.query?.slug === 'string' ? req.query.slug.trim() : '';

      if (!id && !slug) {
        res.statusCode = 400;
        res.end(JSON.stringify({ ok: false, error: 'MISSING_PARAM', message: 'Provide ?id= or ?slug=' }));
        return;
      }

      const { signal, cancel } = withTimeout(10000);
      try {
        let marketPayload: unknown;
        let fetchError: Error | null = null;

        if (id) {
          try {
            marketPayload = await fetchJson(`${GAMMA_BASE}/markets/${encodeURIComponent(id)}`, signal);
          } catch (error) {
            fetchError = error instanceof Error ? error : new Error('SERVER_ERROR');
          }
        }

        if (!marketPayload && slug) {
          try {
            const slugMarketPayload = await fetchJson(
              `${GAMMA_BASE}/markets?slug=${encodeURIComponent(slug)}&limit=10`,
              signal
            );
            const slugCandidates = extractMarketCandidates(slugMarketPayload);
            const exactSlugCandidate =
              slugCandidates.find((candidate) => {
                const candidateSlug = firstString(candidate.slug);
                if (!candidateSlug) return false;
                return normalizeSlug(candidateSlug) === normalizeSlug(slug);
              }) ??
              slugCandidates[0];

            if (exactSlugCandidate) {
              const discoveredId = firstString(
                exactSlugCandidate.id,
                exactSlugCandidate.conditionId,
                exactSlugCandidate.marketId
              );
              if (discoveredId) {
                marketPayload = await fetchJson(
                  `${GAMMA_BASE}/markets/${encodeURIComponent(discoveredId)}`,
                  signal
                );
              } else {
                marketPayload = exactSlugCandidate;
              }
            }
          } catch (error) {
            fetchError = error instanceof Error ? error : new Error('SERVER_ERROR');
          }
        }

        if (!marketPayload && slug) {
          try {
            const eventPayload = await fetchJson(
              `${GAMMA_BASE}/events?slug=${encodeURIComponent(slug)}&active=true`,
              signal
            );
            const discoveredId = extractMarketIdFromPayload(eventPayload, slug);
            if (discoveredId) {
              marketPayload = await fetchJson(
                `${GAMMA_BASE}/markets/${encodeURIComponent(discoveredId)}`,
                signal
              );
            } else {
              const fallbackCandidate = extractMarketCandidates(eventPayload)[0];
              if (fallbackCandidate) {
                marketPayload = fallbackCandidate;
              }
            }
          } catch (error) {
            fetchError = error instanceof Error ? error : new Error('SERVER_ERROR');
          }
        }

        if (!marketPayload) {
          const message = fetchError?.message ?? 'MARKET_NOT_FOUND';
          const errorCode = message.startsWith('UPSTREAM_') ? message : 'MARKET_NOT_FOUND';
          res.statusCode = errorCode === 'MARKET_NOT_FOUND' ? 404 : 502;
          res.end(JSON.stringify({ ok: false, error: errorCode }));
          return;
        }

        const detail = normalizeMarketDetail(marketPayload);
        res.statusCode = 200;
        res.end(JSON.stringify({ ok: true, market: detail }));
        return;
      } finally {
        cancel();
      }
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ ok: false, error: 'NOT_FOUND' }));
  } catch (err) {
    const aborted = err && typeof err === 'object' && (err as Error).name === 'AbortError';
    const message = err instanceof Error ? err.message : 'SERVER_ERROR';
    const unsupported = message === 'UNSUPPORTED_UPSTREAM_SHAPE';
    res.statusCode = aborted ? 504 : unsupported ? 502 : 500;
    res.end(JSON.stringify({ ok: false, error: aborted ? 'TIMEOUT' : unsupported ? message : 'SERVER_ERROR' }));
  }
}
