import { useState, useEffect, useCallback, useRef } from 'react';
import { getSearchEngine, type SearchResult } from '../lib/intelligence';

interface UseOpportunitiesOptions {
  minScore?: number;
  categories?: string[];
  signals?: ('mispricing' | 'volume_spike' | 'sentiment_divergence' | 'time_urgent')[];
  limit?: number;
  refreshInterval?: number; // milliseconds
}

interface UseOpportunitiesReturn {
  opportunities: SearchResult[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useOpportunities(options: UseOpportunitiesOptions = {}): UseOpportunitiesReturn {
  const {
    minScore = 60,
    categories,
    signals,
    limit = 12,
    refreshInterval = 60000, // 1 minute
  } = options;

  const [opportunities, setOpportunities] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isMounted = useRef(true);

  const fetchOpportunities = useCallback(async () => {
    if (!isMounted.current) return;
    
    setLoading(true);
    setError(null);

    try {
      const engine = getSearchEngine();
      
      // Build query based on filters
      let query = '';
      if (signals?.includes('mispricing')) query += 'mispriced ';
      if (signals?.includes('volume_spike')) query += 'volume spike ';
      if (signals?.includes('time_urgent')) query += 'closing soon ';
      
      const results = await engine.search(query || 'opportunities', {
        limit,
        includeSynthesis: true,
        minCompositeScore: minScore,
      });

      // Client-side filter by categories if specified
      let filtered = results;
      if (categories && categories.length > 0) {
        filtered = results.filter(r => 
          categories.includes(r.market.category || '')
        );
      }

      // Client-side filter by signals if specified
      if (signals && signals.length > 0) {
        filtered = filtered.filter(r => {
          if (signals.includes('mispricing') && r.intelligence.mispricingScore >= 60) return true;
          if (signals.includes('volume_spike') && r.intelligence.volumeAnomalyScore >= 60) return true;
          if (signals.includes('sentiment_divergence') && r.intelligence.sentimentDivergence >= 60) return true;
          if (signals.includes('time_urgent') && r.intelligence.timeUrgency >= 70) return true;
          return false;
        });
      }

      if (isMounted.current) {
        setOpportunities(filtered);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch opportunities:', err);
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [minScore, categories, signals, limit]);

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
