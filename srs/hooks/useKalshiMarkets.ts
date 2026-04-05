import { useState, useEffect, useCallback } from 'react';
import type { Topic } from '../lib/kalshi-mapper';

export interface KalshiMarket {
  id: string;
  title: string;
  subtitle: string;
  category: Topic | string;
  probability: number;
  bid: number;
  ask: number;
  volume: number;
  liquidity: number;
  closesAt: string;
  url: string;
}

export interface KalshiResponse {
  ok: boolean;
  feed: string;
  markets: KalshiMarket[];
  meta: {
    topic: string;
    search: string | null;
    count: number;
    total: number;
  };
}

interface UseKalshiMarketsOptions {
  topic?: Topic | null;
  search?: string;
  enabled?: boolean;
}

export function useKalshiMarkets(options: UseKalshiMarketsOptions = {}) {
  const { topic, search, enabled = true } = options;
  
  const [markets, setMarkets] = useState<KalshiMarket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<KalshiResponse['meta'] | null>(null);

  const fetchMarkets = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append('feed', 'kalshi');
      if (topic) params.append('topic', topic);
      if (search) params.append('search', search);
      
      const response = await fetch(`/api/intel-feeds?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: KalshiResponse = await response.json();
      
      if (!data.ok) {
        throw new Error(data.error || 'API error');
      }
      
      setMarkets(data.markets || []);
      setMeta(data.meta);
    } catch (err) {
      console.error('[useKalshiMarkets] Failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch');
      setMarkets([]);
    } finally {
      setLoading(false);
    }
  }, [topic, search, enabled]);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  const refresh = useCallback(() => {
    return fetchMarkets();
  }, [fetchMarkets]);

  return {
    markets,
    loading,
    error,
    meta,
    refresh
  };
}
