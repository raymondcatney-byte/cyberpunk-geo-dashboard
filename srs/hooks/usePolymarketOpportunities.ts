import { useState, useEffect, useCallback, useRef } from 'react';

export type AnomalyType = 'volume_spike' | 'price_swing' | 'volume_accel' | 'liquidity' | 'smart_money';

export interface PolymarketMarket {
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
  volume24h?: number;
  spread?: number;
  change24h?: number;
}

export interface Opportunity {
  market: PolymarketMarket;
  anomalies: AnomalyType[];
  compositeScore: number;
}

export type FilterPreset = 'all' | 'smart_money' | 'major' | 'volatility';

interface UsePolymarketOpportunitiesOptions {
  preset?: FilterPreset;
  limit?: number;
  refreshInterval?: number;
}

interface UsePolymarketOpportunitiesReturn {
  opportunities: Opportunity[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

// Filter by preset on client side
function filterByPreset(opportunities: Opportunity[], preset: FilterPreset): Opportunity[] {
  if (preset === 'all') return opportunities;
  
  return opportunities.filter(opp => {
    switch (preset) {
      case 'smart_money':
        return opp.anomalies.includes('smart_money');
      case 'major':
        return opp.market.volume > 1000000 || opp.anomalies.length >= 2;
      case 'volatility':
        return opp.anomalies.includes('price_swing') || opp.anomalies.includes('volume_spike');
      default:
        return true;
    }
  });
}

export function usePolymarketOpportunities(
  options: UsePolymarketOpportunitiesOptions = {}
): UsePolymarketOpportunitiesReturn {
  const {
    preset = 'all',
    limit = 10,
    refreshInterval = 60000,
  } = options;

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isMounted = useRef(true);

  const fetchOpportunities = useCallback(async () => {
    if (!isMounted.current) return;
    
    console.log('[HOOK] Fetching opportunities...');
    setLoading(true);
    setError(null);

    try {
      // Call merged search API
      console.log('[HOOK] Calling /api/search?action=opportunities');
      const response = await fetch('/api/search?action=opportunities');
      console.log(`[HOOK] Response status: ${response.status}`);
      
      const data = await response.json();
      console.log(`[HOOK] Response data: ok=${data.ok}, count=${data.count}`);
      
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to fetch');
      }

      let opportunities = data.opportunities || [];
      console.log(`[HOOK] Received ${opportunities.length} opportunities`);
      
      // Log first few markets for debugging
      if (opportunities.length > 0) {
        console.log('[HOOK] First opportunity:', {
          question: opportunities[0].market.question?.slice(0, 50),
          category: opportunities[0].market.category,
          score: opportunities[0].compositeScore,
          anomalies: opportunities[0].anomalies
        });
      }
      
      // Filter by preset
      opportunities = filterByPreset(opportunities, preset);
      
      // Sort by composite score
      opportunities.sort((a: Opportunity, b: Opportunity) => b.compositeScore - a.compositeScore);
      
      // Take top N
      opportunities = opportunities.slice(0, limit);

      if (isMounted.current) {
        setOpportunities(opportunities);
        setLastUpdated(new Date());
        console.log(`[HOOK] Set ${opportunities.length} opportunities`);
      }
    } catch (err) {
      console.error('[HOOK] Failed to fetch opportunities:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [preset, limit]);

  // Initial fetch
  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;
    
    const interval = setInterval(fetchOpportunities, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchOpportunities, refreshInterval]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return {
    opportunities,
    loading,
    error,
    refresh: fetchOpportunities,
    lastUpdated,
  };
}
