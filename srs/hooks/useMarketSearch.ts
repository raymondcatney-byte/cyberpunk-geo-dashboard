import { useState, useCallback, useRef } from 'react';
import { getSearchEngine, type SearchResult, type SearchIntent } from '../lib/intelligence';

interface UseMarketSearchReturn {
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  intent: SearchIntent | null;
  search: (query: string) => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;
}

export function useMarketSearch(): UseMarketSearchReturn {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<SearchIntent | null>(null);
  const lastQuery = useRef('');

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setIntent(null);
      return;
    }

    lastQuery.current = query;
    setLoading(true);
    setError(null);

    try {
      const engine = getSearchEngine();
      const searchResults = await engine.search(query, {
        limit: 20,
        includeSynthesis: true,
      });
      
      setResults(searchResults);
      
      // Parse intent for display
      const { getIntentParser } = await import('../lib/intelligence/intent-parser');
      const parsedIntent = getIntentParser().parse(query);
      setIntent(parsedIntent);
      
    } catch (err) {
      console.error('Search failed:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (lastQuery.current) {
      await search(lastQuery.current);
    }
  }, [search]);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
    setIntent(null);
    lastQuery.current = '';
  }, []);

  return {
    results,
    loading,
    error,
    intent,
    search,
    refresh,
    clear,
  };
}
