import { useState, useCallback, useRef } from 'react';

export interface Market {
  id: string;
  title: string;
  description: string;
  slug: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  endDate: string;
  url: string;
}

interface SearchFilters {
  category?: string;
  minLiquidity?: number;
  sort?: 'relevance' | 'volume' | 'liquidity' | 'ending';
  limit?: number;
}

interface SearchState {
  results: Market[];
  loading: boolean;
  error: string | null;
  count: number;
  query: string;
  hasSearched: boolean;
}

export function usePolymarketSearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    loading: false,
    error: null,
    count: 0,
    query: '',
    hasSearched: false
  });

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(async (query: string, filters: SearchFilters = {}) => {
    // Clear any pending debounced search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmedQuery = query.trim();
    
    // If empty query, clear results
    if (!trimmedQuery) {
      setState({
        results: [],
        loading: false,
        error: null,
        count: 0,
        query: '',
        hasSearched: false
      });
      return;
    }

    // Debounce the actual search
    debounceRef.current = setTimeout(async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const params = new URLSearchParams();
        params.set('q', trimmedQuery);
        if (filters.category) params.set('category', filters.category);
        if (filters.minLiquidity) params.set('minLiquidity', String(filters.minLiquidity));
        if (filters.sort) params.set('sort', filters.sort);
        if (filters.limit) params.set('limit', String(filters.limit));

        const response = await fetch(`/api/search?${params.toString()}`, {
          headers: { Accept: 'application/json' }
        });

        const data = await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || 'Search failed');
        }

        setState({
          results: data.markets || [],
          loading: false,
          error: null,
          count: data.count || 0,
          query: trimmedQuery,
          hasSearched: true
        });
      } catch (err) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Search failed',
          hasSearched: true
        }));
      }
    }, 300); // 300ms debounce
  }, []);

  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setState({
      results: [],
      loading: false,
      error: null,
      count: 0,
      query: '',
      hasSearched: false
    });
  }, []);

  return {
    ...state,
    search,
    clear
  };
}
