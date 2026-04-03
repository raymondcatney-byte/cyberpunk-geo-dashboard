/**
 * usePolymarket Hook
 * Fetches enriched market data from CLOB + Gamma APIs
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { EnrichedMarket, EnrichedEvent } from '../../types/polymarket';

interface UsePolymarketOptions {
  category?: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UsePolymarketReturn {
  markets: EnrichedMarket[];
  events: EnrichedEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
  priceSource: 'clob' | 'gamma' | null;
}

export function usePolymarket(options: UsePolymarketOptions = {}): UsePolymarketReturn {
  const {
    category,
    limit = 50,
    autoRefresh = true,
    refreshInterval = 5000 // 5 seconds for live prices
  } = options;

  const [markets, setMarkets] = useState<EnrichedMarket[]>([]);
  const [events, setEvents] = useState<EnrichedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [priceSource, setPriceSource] = useState<'clob' | 'gamma' | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('action', 'events');
      params.set('limit', String(limit));
      if (category) {
        params.set('category', category);
      }

      const response = await fetch(`/api/polymarket?${params.toString()}`, {
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to fetch markets');
      }

      // Transform events to markets
      const fetchedMarkets: EnrichedMarket[] = data.events.map((event: any) => ({
        id: event.id,
        conditionId: event.id,
        question: event.question,
        slug: event.slug,
        description: event.description,
        category: event.category || 'other',
        endDate: event.endDate,
        active: event.status === 'active',
        closed: event.status === 'closed',
        volume: event.volume || 0,
        liquidity: event.liquidity || 0,
        outcomes: ['Yes', 'No'],
        outcomePrices: JSON.stringify([event.yesPrice, event.noPrice]),
        yesPrice: event.yesPrice,
        noPrice: event.noPrice,
        bestBid: event.bestBid,
        bestAsk: event.bestAsk,
        spread: event.spread,
        midPrice: event.bestBid && event.bestAsk 
          ? (event.bestBid + event.bestAsk) / 2 
          : event.yesPrice,
        lastTradePrice: event.lastTradePrice,
        priceSource: event.priceSource || 'gamma',
        lastUpdated: event.lastUpdated || new Date().toISOString()
      }));

      const fetchedEvents: EnrichedEvent[] = data.events.map((event: any) => ({
        id: event.id,
        title: event.question,
        slug: event.slug,
        description: event.description,
        category: event.category,
        endDate: event.endDate,
        active: event.status === 'active',
        closed: event.status === 'closed',
        volume: event.volume || 0,
        liquidity: event.liquidity || 0,
        markets: [fetchedMarkets.find(m => m.id === event.id)!].filter(Boolean),
        priceSource: event.priceSource || 'gamma',
        lastUpdated: event.lastUpdated || new Date().toISOString()
      }));

      setMarkets(fetchedMarkets);
      setEvents(fetchedEvents);
      setPriceSource(data.priceSource || 'gamma');
      setLastUpdated(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore abort errors
      }
      console.error('Failed to fetch markets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch markets');
    } finally {
      setLoading(false);
    }
  }, [category, limit]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    markets,
    events,
    loading,
    error,
    refresh: fetchData,
    lastUpdated,
    priceSource
  };
}

export default usePolymarket;
