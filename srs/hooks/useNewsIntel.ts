/**
 * useNewsIntel - Curated News Intelligence for Globe
 * Uses NewsAPI via /api/intel-feeds endpoint
 * 
 * Categories:
 * - geopolitical: sanctions, diplomacy, treaties
 * - economic: trade wars, central banks, inflation
 * - conflict: military exercises, border disputes, airstrikes  
 * - technology: cyber attacks, semiconductor exports, AI regulation
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { globeDataFeed } from '../services/globeDataFeed';

export type NewsCategory = 'geopolitical' | 'economic' | 'conflict' | 'technology';

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: { id: string | null; name: string };
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface UseNewsIntelOptions {
  enabled?: boolean;
  refreshInterval?: number;
  category?: NewsCategory;
  geoTag?: boolean;  // Try to extract locations and add to globe
}

// Simple keyword-based geotagging
const COUNTRY_KEYWORDS: Record<string, { lat: number; lng: number }> = {
  'ukraine': { lat: 48.3794, lng: 31.1656 },
  'russia': { lat: 61.5240, lng: 105.3188 },
  'china': { lat: 35.8617, lng: 104.1954 },
  'israel': { lat: 31.0461, lng: 34.8516 },
  'gaza': { lat: 31.5017, lng: 34.4668 },
  'iran': { lat: 32.4279, lng: 53.6880 },
  'north korea': { lat: 40.3399, lng: 127.5101 },
  'taiwan': { lat: 23.6978, lng: 120.9605 },
  'venezuela': { lat: 6.4238, lng: -66.5897 },
  'yemen': { lat: 15.5527, lng: 48.5164 },
  'syria': { lat: 34.8021, lng: 38.9968 },
  'lebanon': { lat: 33.8547, lng: 35.8623 },
  'saudi': { lat: 23.8859, lng: 45.0792 },
  'turkey': { lat: 38.9637, lng: 35.2433 },
  'india': { lat: 20.5937, lng: 78.9629 },
  'pakistan': { lat: 30.3753, lng: 69.3451 },
  'afghanistan': { lat: 33.9391, lng: 67.7100 },
  'myanmar': { lat: 21.9162, lng: 95.9560 },
  'sudan': { lat: 12.8628, lng: 30.2176 },
  'ethiopia': { lat: 9.1450, lng: 40.4897 },
  'mali': { lat: 17.5707, lng: -3.9962 },
  'niger': { lat: 17.6078, lng: 8.0817 },
  'congo': { lat: -4.0383, lng: 21.7587 },
  'mexico': { lat: 23.6345, lng: -102.5528 },
  'brazil': { lat: -14.2350, lng: -51.9253 },
  'argentina': { lat: -38.4161, lng: -63.6167 },
};

export function useNewsIntel(options: UseNewsIntelOptions = {}) {
  const { 
    enabled = true, 
    refreshInterval = 600000,  // 10 minutes (NewsAPI limit: 100 req/day on free tier)
    category = 'geopolitical',
    geoTag = true
  } = options;
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/intel-feeds?feed=news&category=${category}`);
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const fetchedArticles: NewsArticle[] = data.articles || [];
      
      setArticles(fetchedArticles);
      
      // Geotag and inject to globe if enabled
      if (geoTag && fetchedArticles.length > 0) {
        const geoPoints = fetchedArticles
          .map((article: NewsArticle) => {
            const text = `${article.title} ${article.description}`.toLowerCase();
            
            // Find matching country
            for (const [country, coords] of Object.entries(COUNTRY_KEYWORDS)) {
              if (text.includes(country)) {
                return {
                  id: `news-${article.url}`,
                  lat: coords.lat + (Math.random() - 0.5) * 2,  // Jitter for visibility
                  lng: coords.lng + (Math.random() - 0.5) * 2,
                  layer: 'markets',  // Using markets layer for news (amber color)
                  timestamp: Date.parse(article.publishedAt),
                  color: article.sentiment === 'negative' ? '#ef4444' : 
                         article.sentiment === 'positive' ? '#22c55e' : '#eab308',
                  size: 0.15,
                  opacity: 0.8,
                  pulse: article.sentiment === 'negative',
                  title: article.title.slice(0, 60) + '...',
                  description: `${article.source.name} | ${article.description?.slice(0, 100) || ''}`,
                  category: category,
                  severity: article.sentiment === 'negative' ? 'high' : 'medium' as const,
                  makaveliQuery: `Analyze: ${article.title}`,
                  externalUrl: article.url,
                };
              }
            }
            return null;
          })
          .filter(Boolean);
        
        // Inject to globe
        globeDataFeed.injectPoints('markets', geoPoints);
        console.log(`[useNewsIntel] Geotagged ${geoPoints.length} news articles`);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch news');
      console.error('[useNewsIntel] Failed:', err);
    } finally {
      setLoading(false);
    }
  }, [category, geoTag]);

  useEffect(() => {
    if (!enabled) return;
    
    void fetchNews();
    intervalRef.current = setInterval(fetchNews, refreshInterval);
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, refreshInterval, fetchNews]);

  return { 
    articles,
    loading,
    error,
    refresh: fetchNews,
  };
}
