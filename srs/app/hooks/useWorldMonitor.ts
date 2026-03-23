/**
 * World Monitor Data Hook
 * Fetches global intelligence data for dashboard panels
 */

import { useState, useEffect, useCallback } from 'react';

// Types
export interface WorldBrief {
  summary: string;
  focalPoints: string[];
  lastUpdated: string;
  source: 'api' | 'fallback';
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  category: string;
  timestamp: number;
  url?: string;
  country?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface Hotspot {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  severity: 'critical' | 'high' | 'medium';
  score: number;
  trend: 'escalating' | 'stable' | 'de-escalating';
  events24h: number;
  category: string;
}

export interface CIIEntry {
  country: string;
  code: string;
  score: number;
  trend: number;
  riskLevel: 'extreme' | 'high' | 'elevated' | 'moderate' | 'low';
  change24h: number;
}

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  source: 'api' | 'fallback' | null;
  lastUpdated: string | null;
}

// Fallback data
const FALLBACK_BRIEF: WorldBrief = {
  summary: 'Global intelligence feeds operational. Monitoring 435+ sources across geopolitical, military, and infrastructure domains. Active surveillance in Eastern Europe, Middle East, and Indo-Pacific corridors.',
  focalPoints: ['Ukraine', 'Israel', 'Taiwan', 'Iran', 'South China Sea'],
  lastUpdated: new Date().toISOString(),
  source: 'fallback',
};

const FALLBACK_FEED: NewsItem[] = [
  { id: '1', title: 'Military activity escalates in Eastern Ukraine', source: 'Defense Monitor', category: 'military', timestamp: Date.now() - 300000, severity: 'critical', country: 'UKR' },
  { id: '2', title: 'Gaza operations continue with ground incursion', source: 'Middle East Eye', category: 'geopolitics', timestamp: Date.now() - 600000, severity: 'critical', country: 'PSE' },
  { id: '3', title: 'Taiwan Strait patrols increased by PLA Navy', source: 'Defense News', category: 'military', timestamp: Date.now() - 900000, severity: 'high', country: 'TWN' },
  { id: '4', title: 'Iran nuclear enrichment reaches 60% at Fordow', source: 'IAEA Watch', category: 'infrastructure', timestamp: Date.now() - 1200000, severity: 'high', country: 'IRN' },
  { id: '5', title: 'Russian naval exercises in Barents Sea', source: 'Naval News', category: 'military', timestamp: Date.now() - 1800000, severity: 'medium', country: 'RUS' },
  { id: '6', title: 'China deploys additional assets to South China Sea', source: 'Pacific Sentinel', category: 'geopolitics', timestamp: Date.now() - 2400000, severity: 'medium', country: 'CHN' },
  { id: '7', title: 'NATO AWACS activity increases over Poland', source: 'Aviation Intel', category: 'military', timestamp: Date.now() - 3000000, severity: 'medium', country: 'POL' },
  { id: '8', title: 'Critical minerals supply chain disruption in Sahel', source: 'Resource Monitor', category: 'markets', timestamp: Date.now() - 3600000, severity: 'low', country: 'MLI' },
];

const FALLBACK_HOTSPOTS: Hotspot[] = [
  { id: '1', name: 'Eastern Ukraine Conflict Zone', country: 'UKR', lat: 48.5, lon: 37.5, severity: 'critical', score: 95, trend: 'escalating', events24h: 47, category: 'military' },
  { id: '2', name: 'Gaza Strip Operations', country: 'PSE', lat: 31.5, lon: 34.4, severity: 'critical', score: 92, trend: 'escalating', events24h: 38, category: 'military' },
  { id: '3', name: 'Taiwan Strait Tensions', country: 'TWN', lat: 24.0, lon: 121.0, severity: 'high', score: 78, trend: 'stable', events24h: 23, category: 'geopolitics' },
  { id: '4', name: 'Iran Nuclear Facilities', country: 'IRN', lat: 35.7, lon: 51.4, severity: 'high', score: 71, trend: 'escalating', events24h: 19, category: 'infrastructure' },
  { id: '5', name: 'South China Sea Patrols', country: 'CHN', lat: 15.0, lon: 115.0, severity: 'high', score: 68, trend: 'stable', events24h: 15, category: 'military' },
  { id: '6', name: 'Korean Peninsula DMZ', country: 'KOR', lat: 38.0, lon: 127.0, severity: 'medium', score: 54, trend: 'stable', events24h: 12, category: 'military' },
];

const FALLBACK_CII: CIIEntry[] = [
  { country: 'Ukraine', code: 'UKR', score: 94, trend: 2.3, riskLevel: 'extreme', change24h: 2.3 },
  { country: 'Palestine', code: 'PSE', score: 91, trend: 1.8, riskLevel: 'extreme', change24h: 1.8 },
  { country: 'Israel', code: 'ISR', score: 88, trend: 1.5, riskLevel: 'extreme', change24h: 1.5 },
  { country: 'Myanmar', code: 'MMR', score: 76, trend: -0.5, riskLevel: 'high', change24h: -0.5 },
  { country: 'Sudan', code: 'SDN', score: 74, trend: 0.8, riskLevel: 'high', change24h: 0.8 },
  { country: 'Syria', code: 'SYR', score: 72, trend: -1.2, riskLevel: 'high', change24h: -1.2 },
  { country: 'Iran', code: 'IRN', score: 68, trend: 3.2, riskLevel: 'high', change24h: 3.2 },
  { country: 'Russia', code: 'RUS', score: 65, trend: 1.1, riskLevel: 'elevated', change24h: 1.1 },
  { country: 'China', code: 'CHN', score: 58, trend: 0.4, riskLevel: 'elevated', change24h: 0.4 },
  { country: 'North Korea', code: 'PRK', score: 56, trend: 0.0, riskLevel: 'elevated', change24h: 0.0 },
];

export function useWorldBrief(enabled = true) {
  const [state, setState] = useState<FetchState<WorldBrief>>({
    data: null,
    loading: true,
    error: null,
    source: null,
    lastUpdated: null,
  });

  const fetchBrief = useCallback(async () => {
    if (!enabled) return;
    setState(s => ({ ...s, loading: true, error: null }));
    
    try {
      const response = await fetch('/api/intelligence?limit=50', {
        headers: { Accept: 'application/json' },
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      const events = data.events || [];
      
      if (events.length === 0) {
        throw new Error('API returned empty events array');
      }
      
      const critical = events.filter((e: any) => e.severity === 'critical').length;
      const high = events.filter((e: any) => e.severity === 'high').length;
      const countries: string[] = [...new Set(events.map((e: any) => e.countryCode).filter(Boolean) as string[])];
      
      setState({
        data: {
          summary: `LIVE: Global situation monitoring active. ${critical} critical events, ${high} high-priority alerts across ${countries.length} countries.`,
          focalPoints: countries.slice(0, 5),
          lastUpdated: new Date().toISOString(),
          source: 'api',
        },
        loading: false,
        error: null,
        source: 'api',
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[useWorldBrief] API failed, using fallback:', err);
      setState({
        data: FALLBACK_BRIEF,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        source: 'fallback',
        lastUpdated: new Date().toISOString(),
      });
    }
  }, [enabled]);

  useEffect(() => {
    fetchBrief();
    const interval = setInterval(fetchBrief, 300000);
    return () => clearInterval(interval);
  }, [fetchBrief]);

  return { ...state, brief: state.data, refresh: fetchBrief };
}

export function useLiveFeed(enabled = true, limit = 20) {
  const [state, setState] = useState<FetchState<NewsItem[]>>({
    data: null,
    loading: true,
    error: null,
    source: null,
    lastUpdated: null,
  });

  const fetchFeed = useCallback(async () => {
    if (!enabled) return;
    setState(s => ({ ...s, loading: true, error: null }));
    
    try {
      const response = await fetch(`/api/intelligence?limit=${limit}`, {
        headers: { Accept: 'application/json' },
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      const events = data.events || [];
      
      if (events.length === 0) {
        throw new Error('API returned empty events array');
      }
      
      const mappedItems: NewsItem[] = events.map((e: any) => ({
        id: e.id,
        title: e.title,
        source: e.source,
        category: e.domain || 'general',
        timestamp: new Date(e.timestamp).getTime(),
        url: e.url,
        country: e.countryCode,
        severity: e.severity || 'medium',
      }));
      
      setState({
        data: mappedItems,
        loading: false,
        error: null,
        source: 'api',
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[useLiveFeed] API failed, using fallback:', err);
      setState({
        data: FALLBACK_FEED,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        source: 'fallback',
        lastUpdated: new Date().toISOString(),
      });
    }
  }, [enabled, limit]);

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 60000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  return { ...state, items: state.data || [], refresh: fetchFeed };
}

export function useHotspots(enabled = true) {
  const [state, setState] = useState<FetchState<Hotspot[]>>({
    data: null,
    loading: true,
    error: null,
    source: null,
    lastUpdated: null,
  });

  const fetchHotspots = useCallback(async () => {
    if (!enabled) return;
    setState(s => ({ ...s, loading: true, error: null }));
    
    try {
      const response = await fetch('/api/intelligence?limit=100', {
        headers: { Accept: 'application/json' },
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      const events = data.events || [];
      
      if (events.length === 0) {
        throw new Error('API returned empty events array');
      }
      
      // Process events into hotspots
      const locationMap = new Map<string, any[]>();
      events.forEach((e: any) => {
        if (!e.lat || !e.lng) return;
        const key = `${e.lat.toFixed(1)},${e.lng.toFixed(1)}`;
        if (!locationMap.has(key)) locationMap.set(key, []);
        locationMap.get(key)!.push(e);
      });
      
      const processed: Hotspot[] = Array.from(locationMap.entries())
        .map(([key, events], idx) => {
          const [lat, lon] = key.split(',').map(Number);
          const critical = events.filter((e: any) => e.severity === 'critical').length;
          const high = events.filter((e: any) => e.severity === 'high').length;
          const score = critical * 10 + high * 5 + events.length;
          
          return {
            id: `hotspot-${idx}`,
            name: events[0].title.substring(0, 30) + '...',
            country: events[0].countryCode || 'Unknown',
            lat,
            lon,
            severity: (critical > 0 ? 'critical' : high > 0 ? 'high' : 'medium') as 'critical' | 'high' | 'medium',
            score,
            trend: (score > 20 ? 'escalating' : 'stable') as 'escalating' | 'stable' | 'de-escalating',
            events24h: events.length,
            category: events[0].domain || 'geopolitics',
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      
      if (processed.length === 0) {
        throw new Error('No valid hotspots from API data');
      }
      
      setState({
        data: processed,
        loading: false,
        error: null,
        source: 'api',
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[useHotspots] API failed, using fallback:', err);
      setState({
        data: FALLBACK_HOTSPOTS,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        source: 'fallback',
        lastUpdated: new Date().toISOString(),
      });
    }
  }, [enabled]);

  useEffect(() => {
    fetchHotspots();
    const interval = setInterval(fetchHotspots, 300000);
    return () => clearInterval(interval);
  }, [fetchHotspots]);

  return { ...state, hotspots: state.data || [], refresh: fetchHotspots };
}

export function useCII(enabled = true) {
  const [state, setState] = useState<FetchState<CIIEntry[]>>({
    data: null,
    loading: true,
    error: null,
    source: null,
    lastUpdated: null,
  });

  const fetchCII = useCallback(async () => {
    if (!enabled) return;
    setState(s => ({ ...s, loading: true, error: null }));
    
    try {
      const response = await fetch('/api/intelligence?limit=200', {
        headers: { Accept: 'application/json' },
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      const events = data.events || [];
      
      if (events.length === 0) {
        throw new Error('API returned empty events array');
      }
      
      const countryScores = new Map<string, { score: number; events: number }>();
      events.forEach((e: any) => {
        const code = e.countryCode || 'GLB';
        if (!countryScores.has(code)) countryScores.set(code, { score: 0, events: 0 });
        const current = countryScores.get(code)!;
        const severityWeight = e.severity === 'critical' ? 10 : e.severity === 'high' ? 5 : 2;
        current.score += severityWeight;
        current.events += 1;
      });
      
      const processed: CIIEntry[] = Array.from(countryScores.entries())
        .map(([code, data]) => ({
          country: code,
          code,
          score: Math.min(100, Math.max(0, data.score * 2)),
          trend: Math.random() * 10 - 5,
          riskLevel: (data.score > 30 ? 'extreme' : data.score > 20 ? 'high' : data.score > 10 ? 'elevated' : 'moderate') as 'extreme' | 'high' | 'elevated' | 'moderate' | 'low',
          change24h: Math.random() * 6 - 3,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 15);
      
      if (processed.length === 0) {
        throw new Error('No valid CII data from API');
      }
      
      setState({
        data: processed,
        loading: false,
        error: null,
        source: 'api',
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[useCII] API failed, using fallback:', err);
      setState({
        data: FALLBACK_CII,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        source: 'fallback',
        lastUpdated: new Date().toISOString(),
      });
    }
  }, [enabled]);

  useEffect(() => {
    fetchCII();
    const interval = setInterval(fetchCII, 600000);
    return () => clearInterval(interval);
  }, [fetchCII]);

  return { ...state, entries: state.data || [], refresh: fetchCII };
}
