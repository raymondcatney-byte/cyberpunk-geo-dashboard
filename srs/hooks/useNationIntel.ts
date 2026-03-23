import { useState, useCallback, useEffect } from 'react';
import type { Market } from './useEvents';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  timestamp: string;
  url?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface NationIntel {
  country: string;
  countryCode: string;
  news: NewsItem[];
  markets: Market[];
  loading: boolean;
  error: string | null;
}

const COUNTRY_NAMES: Record<string, string> = {
  ISR: 'Israel',
  UKR: 'Ukraine',
  RUS: 'Russia',
  CHN: 'China',
  IRN: 'Iran',
  TWN: 'Taiwan'
};

export function useNationIntel() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [intel, setIntel] = useState<NationIntel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNationIntel = useCallback(async (countryCode: string) => {
    if (!countryCode) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch RSS news for country
      const newsRes = await fetch(`/api/intelligence?country=${countryCode}&limit=20`);
      const newsData = await newsRes.json();
      
      // Fetch Polymarket markets for country
      const marketsRes = await fetch(`/api/search?action=countryMarkets&country=${countryCode}`);
      const marketsData = await marketsRes.json();
      
      const news: NewsItem[] = (newsData.events || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        source: e.source,
        timestamp: e.timestamp,
        url: e.url,
        severity: e.severity || 'medium'
      }));
      
      setIntel({
        country: COUNTRY_NAMES[countryCode] || countryCode,
        countryCode,
        news,
        markets: marketsData.markets || [],
        loading: false,
        error: null
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  const selectCountry = useCallback((countryCode: string | null) => {
    setSelectedCountry(countryCode);
    if (countryCode) {
      fetchNationIntel(countryCode);
    } else {
      setIntel(null);
    }
  }, [fetchNationIntel]);

  const clearSelection = useCallback(() => {
    setSelectedCountry(null);
    setIntel(null);
  }, []);

  return {
    selectedCountry,
    intel,
    loading,
    error,
    selectCountry,
    clearSelection,
    refresh: () => selectedCountry && fetchNationIntel(selectedCountry)
  };
}
