import { useState, useCallback } from 'react';

const BLACKLIST_REGEX = /\b(NBA|NHL|MLB|FIFA|NFL|World Cup|Stanley Cup|Finals|Grizzlies|Senators|Warriors|UEFA|Champions League|UFC|GTA VI|Movie|Actor|Oscar|Grammy|Basketball|Baseball|Football|Soccer|Hockey|Tennis|Golf)\b/i;

export const CATEGORIES = ['GEOPOLITICS', 'AI', 'DeFi', 'MACRO', 'ENERGY_COMMODITIES', 'BIOTECH'] as const;
export type Category = typeof CATEGORIES[number];

export interface Market {
  id: string;
  question: string;
  description: string;
  slug: string;
  category: string;
  sourceCategory?: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  endDate: string;
  url: string;
  status?: string;
  aliases?: string[];
}

export interface MasterMarkets {
  GEOPOLITICS: Market[];
  AI: Market[];
  DeFi: Market[];
  MACRO: Market[];
  ENERGY_COMMODITIES: Market[];
  BIOTECH: Market[];
}

interface UseEventsReturn {
  masterMarkets: MasterMarkets;
  activeCategory: Category | 'ALL';
  displayedMarkets: Market[];
  searchResults: Market[];
  loading: boolean;
  error: string | null;
  hasLoaded: boolean;
  isSearching: boolean;
  fetchMasterMarkets: () => Promise<void>;
  fetchCategory: (category: Category) => Promise<void>;
  setActiveCategory: (category: Category | 'ALL') => void;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  getCategoryCount: (category: Category) => number;
}

const INITIAL_MASTER_MARKETS: MasterMarkets = {
  GEOPOLITICS: [],
  AI: [],
  DeFi: [],
  MACRO: [],
  ENERGY_COMMODITIES: [],
  BIOTECH: [],
};

function isBlacklisted(title: string): boolean {
  return BLACKLIST_REGEX.test(title);
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeQuery(query: string) {
  return normalizeText(query).split(/\s+/).filter(Boolean);
}

function scoreMarket(market: Market, query: string, activeCategory: Category | 'ALL') {
  const normalizedQuery = normalizeText(query);
  const tokens = tokenizeQuery(query);
  const question = normalizeText(market.question);
  const description = normalizeText(market.description || '');
  const slug = normalizeText(market.slug || '');
  const aliases = Array.isArray(market.aliases) ? market.aliases.map(normalizeText) : [];
  const sourceCategory = normalizeText(market.sourceCategory || '');

  let score = 0;

  if (activeCategory !== 'ALL' && market.category === activeCategory) score += 20;
  if (question === normalizedQuery || slug === normalizedQuery) score += 150;
  else if (question.includes(normalizedQuery)) score += 75;
  else if (slug.includes(normalizedQuery)) score += 60;

  for (const token of tokens) {
    if (question.includes(token)) score += 26;
    else if (slug.includes(token)) score += 22;
    else if (aliases.some((alias) => alias.includes(token))) score += 16;
    else if (description.includes(token)) score += 10;
    else if (sourceCategory.includes(token)) score += 8;
  }

  if (tokens.length > 1 && tokens.every((token) =>
    question.includes(token) ||
    slug.includes(token) ||
    aliases.some((alias) => alias.includes(token)) ||
    description.includes(token)
  )) {
    score += 25;
  }

  if (market.sourceCategory && market.sourceCategory !== 'discovery') score += 12;
  if ((market.status || '').toLowerCase() === 'active') score += 8;
  if (market.liquidity > 1_000_000) score += 8;
  else if (market.liquidity > 100_000) score += 4;
  if (market.volume > 500_000) score += 6;

  return score;
}

function rankedSearch(markets: Market[], query: string, activeCategory: Category | 'ALL'): Market[] {
  if (!query.trim()) return [];

  return markets
    .filter((market) => !isBlacklisted(market.question))
    .map((market) => ({ market, score: scoreMarket(market, query, activeCategory) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.market.liquidity - a.market.liquidity || b.market.volume - a.market.volume)
    .map((entry) => entry.market);
}

export function useEvents(): UseEventsReturn {
  const [masterMarkets, setMasterMarkets] = useState<MasterMarkets>(INITIAL_MASTER_MARKETS);
  const [activeCategory, setActiveCategoryState] = useState<Category | 'ALL'>('ALL');
  const [searchResults, setSearchResults] = useState<Market[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const fetchMasterMarkets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/search?action=masterMarkets', {
        headers: { Accept: 'application/json' }
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to fetch markets');
      }

      const filtered: MasterMarkets = {
        GEOPOLITICS: (data.masterMarkets.GEOPOLITICS || []).filter((m: Market) => !isBlacklisted(m.question)),
        AI: (data.masterMarkets.AI || []).filter((m: Market) => !isBlacklisted(m.question)),
        DeFi: (data.masterMarkets.DeFi || []).filter((m: Market) => !isBlacklisted(m.question)),
        MACRO: (data.masterMarkets.MACRO || []).filter((m: Market) => !isBlacklisted(m.question)),
        ENERGY_COMMODITIES: (data.masterMarkets.ENERGY_COMMODITIES || []).filter((m: Market) => !isBlacklisted(m.question)),
        BIOTECH: (data.masterMarkets.BIOTECH || []).filter((m: Market) => !isBlacklisted(m.question)),
      };

      setMasterMarkets(filtered);
      setHasLoaded(true);
      setSearchResults([]);
      setSearchQuery('');
      setIsSearching(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategory = useCallback(async (category: Category) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/polymarket/events?category=${encodeURIComponent(category)}&limit=50&closed=false`,
        { headers: { Accept: 'application/json' } }
      );
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to fetch category');
      }

      const events: Market[] = Array.isArray(data.events) ? data.events : [];
      const filtered = events.filter((m) => !isBlacklisted(m.question));

      setMasterMarkets((prev) => ({
        ...prev,
        [category]: filtered,
      }));
      setHasLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Preserve last-known-good data.
    } finally {
      setLoading(false);
    }
  }, []);

  const setActiveCategory = useCallback((category: Category | 'ALL') => {
    setActiveCategoryState(category);
    setSearchResults([]);
    setSearchQuery('');
    setIsSearching(false);
  }, []);

  const search = useCallback(async (query: string) => {
    const q = query.trim();
    setSearchQuery(query);

    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setLoading(true);
    setError(null);

    try {
      const categoryParam = activeCategory !== 'ALL' ? `&category=${encodeURIComponent(activeCategory)}` : '';
      const response = await fetch(
        `/api/polymarket/search?q=${encodeURIComponent(q)}${categoryParam}&limit=20&closed=false`,
        { headers: { Accept: 'application/json' } }
      );

      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Search failed');
      const events: Market[] = Array.isArray(data.events) ? data.events : [];

      setSearchResults(events.filter((m) => !isBlacklisted(m.question)));
      setHasLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      // Preserve last-known-good searchResults.
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchQuery('');
    setIsSearching(false);
    setError(null);
  }, []);

  const getCategoryCount = useCallback((category: Category): number => {
    return masterMarkets[category]?.length || 0;
  }, [masterMarkets]);

  const displayedMarkets = (() => {
    if (isSearching) return searchResults;
    if (activeCategory === 'ALL') return Object.values(masterMarkets).flat();
    return masterMarkets[activeCategory] || [];
  })();

  return {
    masterMarkets,
    activeCategory,
    displayedMarkets,
    searchResults,
    loading,
    error,
    hasLoaded,
    isSearching,
    fetchMasterMarkets,
    fetchCategory,
    setActiveCategory,
    search,
    clearSearch,
    getCategoryCount,
  };
}
