/**
 * usePubMedResearch Hook - Protocol Tab Research Integration
 * Provides evidence-based research from PubMed for health/supplement queries
 */

import { useState, useCallback } from 'react';

export interface PubMedArticle {
  pmid: string;
  title: string;
  abstract: string | null;
  pubDate: string;
  authors: string[];
  journal: string;
  url: string;
}

export interface PubMedResponse {
  articles: PubMedArticle[];
  totalResults: number;
  query: string;
}

export interface UsePubMedResearchReturn {
  search: (query: string) => Promise<void>;
  articles: PubMedArticle[];
  totalResults: number;
  loading: boolean;
  error: string | null;
  clear: () => void;
}

export function usePubMedResearch(): UsePubMedResearchReturn {
  const [articles, setArticles] = useState<PubMedArticle[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/intel-feeds?feed=pubmed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: PubMedResponse = await response.json();
      setArticles(data.articles);
      setTotalResults(data.totalResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch PubMed data');
      setArticles([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setArticles([]);
    setTotalResults(0);
    setError(null);
  }, []);

  return {
    search,
    articles,
    totalResults,
    loading,
    error,
    clear,
  };
}
