/**
 * useSentimentData - GDELT Global Sentiment Analysis
 * 100% FREE, no API key required
 * https://blog.gdeltproject.org
 */

import { useEffect, useCallback, useRef } from 'react';
import { globeDataFeed } from '../services/globeDataFeed';

interface SentimentRegion {
  country: string;
  lat: number;
  lng: number;
  sentiment: number;  // -1 to 1
  volume: number;     // news volume
  fearIndex: number;  // 0-1
  timestamp: string;
}

interface UseSentimentDataOptions {
  enabled?: boolean;
  refreshInterval?: number;
  theme?: 'conflict' | 'economy' | 'health' | 'climate';
}

export function useSentimentData(options: UseSentimentDataOptions = {}) {
  const { enabled = true, refreshInterval = 300000, theme = 'conflict' } = options;  // 5 min default
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSentiment = useCallback(async () => {
    try {
      // Use existing intel-feeds endpoint
      const response = await fetch(`/api/intel-feeds?feed=gdelt&theme=${theme.toUpperCase()}`);
      if (!response.ok) throw new Error(`GDELT error: ${response.status}`);
      
      const data = await response.json();
      const events = data.events || [];
      
      // Aggregate by country/region
      const sentimentMap = new Map<string, SentimentRegion>();
      
      events.forEach((event: any) => {
        const country = event.location?.country || 'Unknown';
        const existing = sentimentMap.get(country);
        
        if (existing) {
          // Average sentiment
          existing.sentiment = (existing.sentiment + (event.tone || 0) / 100) / 2;
          existing.volume += 1;
          existing.fearIndex = Math.max(existing.fearIndex, event.theme?.includes('CONFLICT') ? 0.8 : 0.3);
        } else {
          sentimentMap.set(country, {
            country,
            lat: event.location?.lat || 0,
            lng: event.location?.lng || 0,
            sentiment: (event.tone || 0) / 100,  // Normalize -1 to 1
            volume: 1,
            fearIndex: event.theme?.includes('CONFLICT') ? 0.8 : 0.3,
            timestamp: event.timestamp,
          });
        }
      });
      
      // Convert to regions format for globe
      const regions = Array.from(sentimentMap.values()).map(s => ({
        bounds: {
          north: s.lat + 5,
          south: s.lat - 5,
          east: s.lng + 5,
          west: s.lng - 5,
        },
        color: s.fearIndex > 0.5 ? '#ef4444' : s.sentiment < 0 ? '#f59e0b' : '#22c55e',
        opacity: 0.3 + s.fearIndex * 0.4,
        intensity: s.fearIndex,
        sentiment: s.fearIndex > 0.5 ? 'fear' : s.sentiment < 0 ? 'uncertainty' : 'neutral',
        label: `${s.country}: ${s.volume} events`,
      }));
      
      // Inject as regions (heatmap)
      globeDataFeed.injectRegions('sentiment', regions);
      
    } catch (err) {
      console.error('[useSentimentData] Failed:', err);
    }
  }, [theme]);

  useEffect(() => {
    if (!enabled) return;
    
    void fetchSentiment();
    intervalRef.current = setInterval(fetchSentiment, refreshInterval);
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, refreshInterval, fetchSentiment]);

  return { refresh: fetchSentiment };
}
