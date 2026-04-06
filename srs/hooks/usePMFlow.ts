import { useState, useEffect, useCallback } from 'react';
import { UnusualFlowSignal } from '../../lib/unusual-flow/types';

interface UsePMFlowOptions {
  limit?: number;
  minSeverity?: 'NOTABLE' | 'UNUSUAL' | 'SUSPICIOUS' | 'WHALE_ALERT';
  category?: string;
  refreshInterval?: number;
}

interface FlowApiResponse {
  alerts: UnusualFlowSignal[];
  count: number;
  lastUpdated: number;
  categories: string[];
  error?: string;
}

export function usePMFlow(options: UsePMFlowOptions = {}) {
  const {
    limit = 20,
    minSeverity = 'NOTABLE',
    category,
    refreshInterval = 15000
  } = options;

  const [data, setData] = useState<FlowApiResponse>({
    alerts: [],
    count: 0,
    lastUpdated: 0,
    categories: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlow = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      params.set('minSeverity', minSeverity);
      if (category) params.set('category', category);

      const apiUrl = `/api/flow?${params}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch flow data';
      setError(message);
      console.error('[usePMFlow] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [limit, minSeverity, category]);

  useEffect(() => {
    // Initial fetch
    fetchFlow();

    // Set up polling
    const interval = setInterval(fetchFlow, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchFlow, refreshInterval]);

  return {
    alerts: data.alerts,
    count: data.count,
    categories: data.categories,
    lastUpdated: data.lastUpdated,
    isLoading,
    error,
    refetch: fetchFlow
  };
}
