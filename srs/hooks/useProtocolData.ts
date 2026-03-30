/**
 * Unified Protocol Data Hook
 * Manages all Protocol tab API calls with caching and request deduplication
 * Replaces individual useState + useEffect patterns in ProtocolKnowledgeWorkbench
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { watchtowerCache, pubmedCache, consultantCache } from '../lib/protocolQueryCache';

interface WatchtowerResult {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  tags?: string[];
}

interface PubMedArticle {
  pmid: string;
  title: string;
  abstract: string | null;
  pubDate: string;
  authors: string[];
  journal: string;
  url: string;
}

interface ProtocolDataState {
  watchtower: {
    results: WatchtowerResult[];
    loading: boolean;
    error: string | null;
  };
  pubmed: {
    articles: PubMedArticle[];
    total: number;
    loading: boolean;
    error: string | null;
  };
  consultant: {
    response: string | null;
    loading: boolean;
    error: string | null;
  };
}

interface UseProtocolDataReturn extends ProtocolDataState {
  fetchAll: (query: string, protocolTitle?: string) => void;
  cancelPending: () => void;
}

const initialState: ProtocolDataState = {
  watchtower: { results: [], loading: false, error: null },
  pubmed: { articles: [], total: 0, loading: false, error: null },
  consultant: { response: null, loading: false, error: null },
};

export function useProtocolData(): UseProtocolDataReturn {
  const [state, setState] = useState<ProtocolDataState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingQueryRef = useRef<string | null>(null);

  // Cancel any pending requests
  const cancelPending = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelPending();
  }, [cancelPending]);

  const fetchAll = useCallback((query: string, protocolTitle?: string) => {
    // Cancel previous pending requests
    cancelPending();
    
    const trimmedQuery = query.trim();
    const effectiveQuery = trimmedQuery || protocolTitle || 'longevity sleep recovery';
    
    pendingQueryRef.current = effectiveQuery;
    
    // Debounce for 500ms
    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      // Check caches first
      const cachedWatchtower = watchtowerCache.get(effectiveQuery);
      const cachedPubmed = pubmedCache.get(effectiveQuery);
      const cachedConsultant = consultantCache.get(effectiveQuery);
      
      // Set initial state with cached data if available
      setState(prev => ({
        watchtower: {
          results: cachedWatchtower || prev.watchtower.results,
          loading: !cachedWatchtower,
          error: null,
        },
        pubmed: {
          articles: cachedPubmed?.articles || prev.pubmed.articles,
          total: cachedPubmed?.total || prev.pubmed.total,
          loading: !cachedPubmed,
          error: null,
        },
        consultant: {
          response: cachedConsultant || prev.consultant.response,
          loading: !cachedConsultant,
          error: null,
        },
      }));
      
      // Fetch in parallel
      const promises: Promise<void>[] = [];
      
      // Watchtower fetch (if stale or not cached)
      if (!cachedWatchtower || watchtowerCache.isStale(effectiveQuery)) {
        promises.push(
          fetchWatchtower(effectiveQuery, controller.signal)
            .then(data => {
              if (!controller.signal.aborted) {
                watchtowerCache.set(effectiveQuery, data);
                setState(prev => ({
                  ...prev,
                  watchtower: { results: data, loading: false, error: null },
                }));
              }
            })
            .catch(err => {
              if (!controller.signal.aborted) {
                setState(prev => ({
                  ...prev,
                  watchtower: { ...prev.watchtower, loading: false, error: err.message },
                }));
              }
            })
        );
      }
      
      // PubMed fetch (if stale or not cached)
      if (!cachedPubmed || pubmedCache.isStale(effectiveQuery)) {
        promises.push(
          fetchPubMed(effectiveQuery, controller.signal)
            .then(data => {
              if (!controller.signal.aborted) {
                pubmedCache.set(effectiveQuery, data);
                setState(prev => ({
                  ...prev,
                  pubmed: { articles: data.articles, total: data.total, loading: false, error: null },
                }));
              }
            })
            .catch(err => {
              if (!controller.signal.aborted) {
                setState(prev => ({
                  ...prev,
                  pubmed: { ...prev.pubmed, loading: false, error: err.message },
                }));
              }
            })
        );
      }
      
      // Consultant fetch (if stale or not cached)
      if (!cachedConsultant || consultantCache.isStale(effectiveQuery)) {
        promises.push(
          fetchConsultant(effectiveQuery, controller.signal)
            .then(data => {
              if (!controller.signal.aborted) {
                consultantCache.set(effectiveQuery, data);
                setState(prev => ({
                  ...prev,
                  consultant: { response: data, loading: false, error: null },
                }));
              }
            })
            .catch(err => {
              if (!controller.signal.aborted) {
                setState(prev => ({
                  ...prev,
                  consultant: { ...prev.consultant, loading: false, error: err.message },
                }));
              }
            })
        );
      }
      
      await Promise.allSettled(promises);
      
    }, 500);
  }, [cancelPending]);

  return {
    ...state,
    fetchAll,
    cancelPending,
  };
}

// Fetch Watchtower data
async function fetchWatchtower(query: string, signal: AbortSignal): Promise<WatchtowerResult[]> {
  const qParts = [query].join(' ').replace(/\s+/g, ' ').trim();
  
  const response = await fetch(
    `/api/watchtower/search?q=${encodeURIComponent(qParts)}&limit=30`,
    {
      headers: { Accept: 'application/json' },
      signal,
    }
  );
  
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || 'WATCHTOWER_FAILED');
  }
  
  const results = Array.isArray(payload.results) ? payload.results : [];
  
  const biotechTags = new Set(['biotech', 'health', 'fda', 'nih', 'pharma', 'medicine', 'clinical']);
  const tagged = results.filter((item: any) => {
    const tags = Array.isArray(item?.tags) ? item.tags : [];
    return tags.some((tag: unknown) => biotechTags.has(String(tag).toLowerCase()));
  });
  
  return (tagged.length ? tagged : results).slice(0, 8);
}

// Fetch PubMed data
async function fetchPubMed(query: string, signal: AbortSignal): Promise<{ articles: PubMedArticle[]; total: number }> {
  const response = await fetch('/api/intel-feeds?feed=pubmed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: query.trim() }),
    signal,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  
  const data = await response.json();
  return {
    articles: data.articles || [],
    total: data.totalResults || 0,
  };
}

// Fetch Consultant data
async function fetchConsultant(query: string, signal: AbortSignal): Promise<string> {
  const response = await fetch('/api/protocol-consultant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query }),
    signal,
  });
  
  const payload = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new Error(payload.error || 'CONSULTANT_FAILED');
  }
  
  return typeof payload.response === 'string' ? payload.response : '';
}
