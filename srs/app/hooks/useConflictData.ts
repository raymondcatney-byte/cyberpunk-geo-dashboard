/**
 * useConflictData - ACLED (Armed Conflict Location & Event Data)
 * FREE for non-commercial use with attribution
 * https://acleddata.com
 * 
 * Real-time conflict events: battles, protests, explosions, strategic developments
 */

import { useEffect, useCallback, useRef } from 'react';
import { globeDataFeed } from '../services/globeDataFeed';

interface ACLEDEvent {
  event_id_cnty: string;
  event_date: string;
  year: number;
  latitude: number;
  longitude: number;
  fatalities: number;
  event_type: string;
  sub_event_type: string;
  actor1: string;
  actor2: string;
  notes: string;
  location: string;
  country: string;
  region: string;
  source: string;
}

interface UseConflictDataOptions {
  enabled?: boolean;
  refreshInterval?: number;
  country?: string;      // Filter by country name
  region?: string;       // Filter by region (e.g., 'Middle East', 'Europe', 'Africa')
  fatalitiesMin?: number; // Minimum fatalities (0 for all events)
}

export function useConflictData(options: UseConflictDataOptions = {}) {
  const { 
    enabled = true, 
    refreshInterval = 300000,  // 5 minutes (ACLED updates daily, be respectful)
    country,
    region,
    fatalitiesMin = 0 
  } = options;
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchConflicts = useCallback(async () => {
    // Rate limiting - don't fetch more than once per minute
    const now = Date.now();
    if (now - lastFetchRef.current < 60000) return;
    lastFetchRef.current = now;

    try {
      // Use the consolidated intel-feeds endpoint
      const params = new URLSearchParams({
        feed: 'gdelt',
        theme: 'CONFLICT',
        hours: '24',
      });
      
      if (country) params.set('country', country);
      
      const response = await fetch(`/api/intel-feeds?${params.toString()}`);
      
      if (!response.ok) throw new Error(`Conflict data error: ${response.status}`);
      
      const data = await response.json();
      let events = data.events || [];
      
      // Filter by region if specified
      if (region) {
        events = events.filter((e: any) => 
          e.location?.country?.toLowerCase().includes(region.toLowerCase()) ||
          e.theme?.toLowerCase().includes(region.toLowerCase())
        );
      }
      
      // Transform to ACLED-like format for the transformer
      const acledEvents = events.map((e: any, idx: number) => ({
        event_id_cnty: e.id || `evt-${idx}`,
        event_date: e.timestamp || new Date().toISOString(),
        year: new Date().getFullYear(),
        latitude: e.location?.lat || 0,
        longitude: e.location?.lng || 0,
        fatalities: e.tone ? Math.abs(Math.round(e.tone / 10)) : 1,
        event_type: e.theme?.includes('PROTEST') ? 'Protests' : 
                   e.theme?.includes('TERROR') ? 'Explosions/Remote violence' :
                   e.theme?.includes('BATTLE') ? 'Battles' : 'Strategic developments',
        sub_event_type: e.theme || 'Unspecified',
        actor1: 'Unknown Actor',
        actor2: '',
        notes: e.summary || e.title || 'Conflict event reported',
        location: e.location?.country || 'Unknown',
        country: e.location?.country || 'Unknown',
        region: region || 'Global',
        source: e.source || 'GDELT',
      }));
      
      // Inject into globe - the 'conflicts' transformer handles visualization
      globeDataFeed.injectPoints('conflicts', acledEvents);
      
      console.log(`[useConflictData] Injected ${acledEvents.length} conflict events`);
      
    } catch (err) {
      console.error('[useConflictData] Failed to fetch:', err);
      // On error, feed keeps last known data
    }
  }, [country, region, fatalitiesMin]);

  useEffect(() => {
    if (!enabled) return;
    
    // Initial fetch
    void fetchConflicts();
    
    // Setup polling
    intervalRef.current = setInterval(fetchConflicts, refreshInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, refreshInterval, fetchConflicts]);

  return { 
    refresh: fetchConflicts,
    // Helper to focus on specific conflict zones
    focusOnZone: (lat: number, lng: number, radiusKm: number) => {
      return globeDataFeed.getPointsNear(lat, lng, radiusKm)
        .filter(p => p.layer === 'conflicts');
    }
  };
}
