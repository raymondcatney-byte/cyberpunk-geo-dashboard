import { useCallback, useEffect, useState } from 'react';
import { getTradingSnapshot, type TradingPolymarketMarket, type TradingWhaleTrade, type TradingYieldPool } from '../lib/trading-intel';

export interface PolymarketEvent {
  id: string;
  title: string;
  slug?: string;
  url?: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity?: number;
  category?: string;
  endDate?: string;
  change24h?: number;
}

export interface DeFiProtocolData {
  protocol: {
    name: string;
    symbol: string;
    slug: string;
    tvl: number;
    tvl_change_24h: number;
    tvl_change_7d: number;
    fees_24h: number;
    fees_7d: number;
    revenue_24h: number;
  };
  token: {
    current_price: number;
    price_change_24h: number;
    price_change_7d: number;
    market_cap: number;
    circulating_supply: number;
  } | null;
  sentiment: {
    score: number;
    label: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
  } | null;
  ratios: {
    mcap_tvl: number | null;
    fees_tvl: number | null;
  };
  alerts: string[];
}

export interface YieldData {
  id: string;
  symbol: string;
  chain: string;
  project: string;
  apy: number;
  tvl: number;
  apyChange24h?: number;
  viabilityScore?: number;
}

export interface LargeTrade {
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
}

const CACHE_KEY = 'defi_data_cache';
const CACHE_TTL = 5 * 60 * 1000;

function getCache(slug: string): DeFiProtocolData | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(`${CACHE_KEY}_${slug}`);
    if (!cached) return null;
    const entry = JSON.parse(cached) as { data: DeFiProtocolData; timestamp: number };
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(`${CACHE_KEY}_${slug}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setCache(slug: string, data: DeFiProtocolData) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${CACHE_KEY}_${slug}`, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Ignore cache errors.
  }
}

function mapPolymarket(events: TradingPolymarketMarket[]): PolymarketEvent[] {
  return events.map((event) => ({
    id: event.id,
    title: event.title,
    slug: event.slug,
    url: event.url,
    yesPrice: event.yesPrice,
    noPrice: event.noPrice,
    volume: event.volume,
    liquidity: event.liquidity,
    category: event.category,
    endDate: event.endDate,
  }));
}

function mapYields(yields: TradingYieldPool[]): YieldData[] {
  return yields.map((pool) => ({
    id: pool.id,
    symbol: pool.symbol,
    chain: pool.chain,
    project: pool.project,
    apy: pool.apy,
    tvl: pool.tvl,
    apyChange24h: pool.apyChange24h,
    viabilityScore: pool.viabilityScore,
  }));
}

function mapWhales(trades: TradingWhaleTrade[]): LargeTrade[] {
  return trades.map((trade) => ({
    id: trade.id,
    type: trade.type,
    value: trade.value,
    valueFormatted: trade.valueFormatted,
    token: trade.token,
    tokenSymbol: trade.tokenSymbol,
    dex: trade.dex,
    chain: trade.chain,
    timestamp: trade.timestamp,
    txHash: trade.txHash,
    explorerUrl: trade.explorerUrl,
  }));
}

export function useDeFiData(slug: string) {
  const [data, setData] = useState<DeFiProtocolData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const normalizedSlug = slug.trim().toLowerCase();
    if (!normalizedSlug) return;

    const cached = getCache(normalizedSlug);
    if (cached) {
      setData(cached);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/defi/protocol?slug=${encodeURIComponent(normalizedSlug)}`, {
        headers: { Accept: 'application/json' },
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error || 'PROTOCOL_FAILED');
      }
      setData(payload.data as DeFiProtocolData);
      setCache(normalizedSlug, payload.data as DeFiProtocolData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (slug) void fetchData();
  }, [slug, fetchData]);

  return { data, loading, error, refresh: fetchData };
}

export function useProtocolSentiment(protocolName: string) {
  const [sentiment, setSentiment] = useState<DeFiProtocolData['sentiment']>(null);

  useEffect(() => {
    if (!protocolName.trim()) {
      setSentiment(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetch(`/api/defi/sentiment?protocol=${encodeURIComponent(protocolName)}`, {
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok || !payload.sentiment) throw new Error(payload.error || 'SENTIMENT_FAILED');
        if (!cancelled) setSentiment(payload.sentiment);
      } catch {
        if (!cancelled) setSentiment({ score: 0, label: 'neutral', confidence: 50 });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [protocolName]);

  return sentiment;
}

export function usePolymarketData(enabled: boolean = true) {
  const [events, setEvents] = useState<PolymarketEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const snapshot = await getTradingSnapshot();
      setEvents(mapPolymarket(snapshot.polymarket));
    } catch (error) {
      console.error('Polymarket fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) void fetchData();
  }, [enabled, fetchData]);

  return { events, loading, refresh: fetchData };
}

export function useYieldRadar(enabled: boolean = true) {
  const [yields, setYields] = useState<YieldData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/defi?action=yields', { headers: { Accept: 'application/json' } });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'YIELDS_FAILED');
      const next = mapYields(Array.isArray(payload.yields) ? payload.yields : []);
      if (next.length === 0) {
        throw new Error('NO_DATA');
      }
      setYields(next);
      setLastUpdated(payload.updatedAt || new Date().toISOString());
    } catch (error) {
      console.error('Yield fetch error:', error);
      setYields([]);
      setError(error instanceof Error ? error.message : 'YIELDS_FAILED');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) void fetchData();
  }, [enabled, fetchData]);

  return { yields, loading, error, lastUpdated, refresh: fetchData };
}

export function useLargeTrades(enabled: boolean = true) {
  const [trades, setTrades] = useState<LargeTrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const snapshot = await getTradingSnapshot();
      const whales = mapWhales(snapshot.whales);
      const source = snapshot.sources.find((s) => s.key === 'whales');
      if (source && source.status === 'degraded') {
        throw new Error(source.detail || 'DEGRADED');
      }
      if (whales.length === 0) {
        throw new Error('NO_DATA');
      }
      setTrades(whales);
      setLastUpdated(source?.lastUpdated || snapshot.generatedAt || new Date().toISOString());
    } catch (error) {
      console.error('Large trades fetch error:', error);
      setTrades([]);
      setError(error instanceof Error ? error.message : 'WHALES_FAILED');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) void fetchData();
  }, [enabled, fetchData]);

  return { trades, loading, error, lastUpdated, refresh: fetchData };
}

export const useWhaleWatcher = useLargeTrades;
