import { useState, useCallback } from 'react';

// Sports/Entertainment Blacklist - Same as API for client-side safety
const BLACKLIST_REGEX = /\b(NBA|NHL|MLB|FIFA|NFL|World Cup|Stanley Cup|Finals|Grizzlies|Senators|Warriors|UEFA|Champions League|UFC|GTA VI|Movie|Actor|Oscar|Grammy|Basketball|Baseball|Football|Soccer|Hockey|Tennis|Golf)\b/i;

// Categories
export const CATEGORIES = ['GEOPOLITICS', 'AI', 'DeFi', 'MACRO', 'ENERGY_COMMODITIES', 'BIOTECH'] as const;
export type Category = typeof CATEGORIES[number];

export interface Market {
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
  setActiveCategory: (category: Category | 'ALL') => void;
  search: (query: string) => void;
  clearSearch: () => void;
  getCategoryCount: (category: Category) => number;
}

const INITIAL_MASTER_MARKETS: MasterMarkets = {
  GEOPOLITICS: [],
  AI: [],
  DeFi: [],
  MACRO: [],
  ENERGY_COMMODITIES: [],
  BIOTECH: []
};

// Client-side blacklist check (defense in depth)
function isBlacklisted(title: string): boolean {
  return BLACKLIST_REGEX.test(title);
}

// Strict surgical search - lowercase includes only
function surgicalSearch(markets: Market[], query: string): Market[] {
  if (!query.trim()) return [];
  
  const q = query.toLowerCase().trim();
  
  return markets.filter(market => {
    // Skip blacklisted titles (defense in depth)
    if (isBlacklisted(market.question)) return false;
    
    const question = market.question.toLowerCase();
    const description = (market.description || '').toLowerCase();
    
    // STRICT MATCH: lowercase includes only
    return question.includes(q) || description.includes(q);
  });
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

  // Fetch master markets from API
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
      
      // Apply client-side blacklist filter (defense in depth)
      const filtered: MasterMarkets = {
        GEOPOLITICS: (data.masterMarkets.GEOPOLITICS || []).filter(m => !isBlacklisted(m.question)),
        AI: (data.masterMarkets.AI || []).filter(m => !isBlacklisted(m.question)),
        DeFi: (data.masterMarkets.DeFi || []).filter(m => !isBlacklisted(m.question)),
        MACRO: (data.masterMarkets.MACRO || []).filter(m => !isBlacklisted(m.question)),
        ENERGY_COMMODITIES: (data.masterMarkets.ENERGY_COMMODITIES || []).filter(m => !isBlacklisted(m.question)),
        BIOTECH: (data.masterMarkets.BIOTECH || []).filter(m => !isBlacklisted(m.question))
      };
      
      setMasterMarkets(filtered);
      setHasLoaded(true);
      setSearchResults([]);
      setSearchQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setMasterMarkets(INITIAL_MASTER_MARKETS);
    } finally {
      setLoading(false);
    }
  }, []);

  // Set active category
  const setActiveCategory = useCallback((category: Category | 'ALL') => {
    setActiveCategoryState(category);
    // Clear search when changing categories
    setSearchResults([]);
    setSearchQuery('');
    setIsSearching(false);
  }, []);

  // Surgical search - client side only, no API
  const search = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    
    // Get markets to search based on active category
    let marketsToSearch: Market[] = [];
    
    if (activeCategory === 'ALL') {
      // Search all categories
      marketsToSearch = Object.values(masterMarkets).flat();
    } else {
      // Search only active category
      marketsToSearch = masterMarkets[activeCategory] || [];
    }
    
    // Surgical search - strict match
    const results = surgicalSearch(marketsToSearch, query);
    
    setSearchResults(results);
  }, [activeCategory, masterMarkets]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchQuery('');
    setIsSearching(false);
  }, []);

  // Get count for a category
  const getCategoryCount = useCallback((category: Category): number => {
    return masterMarkets[category]?.length || 0;
  }, [masterMarkets]);

  // Determine displayed markets
  const displayedMarkets = (() => {
    if (isSearching) {
      return searchResults;
    }
    
    if (activeCategory === 'ALL') {
      return Object.values(masterMarkets).flat();
    }
    
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
    setActiveCategory,
    search,
    clearSearch,
    getCategoryCount
  };
}
