/**
 * useEarthquakeData - USGS Real-time Earthquake Feed
 * 100% FREE, no API key required
 * https://earthquake.usgs.gov/fdsnws/event/1/
 */

import { useEffect, useCallback, useRef } from 'react';
import { globeDataFeed } from '../services/globeDataFeed';

interface USGSEarthquake {
  id: string;
  properties: {
    mag: number;
    place: string;
    time: number;
    url: string;
    tsunami: number;
    alert?: 'green' | 'yellow' | 'orange' | 'red';
  };
  geometry: {
    coordinates: [number, number, number];  // [lng, lat, depth]
  };
}

interface UseEarthquakeDataOptions {
  enabled?: boolean;
  refreshInterval?: number;
  minMagnitude?: number;  // 4.5, 2.5, 1.0, or 'significant'
}

export function useEarthquakeData(options: UseEarthquakeDataOptions = {}) {
  const { enabled = true, refreshInterval = 60000, minMagnitude = 4.5 } = options;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEarthquakes = useCallback(async () => {
    try {
      // USGS feeds available:
      // - significant (significant earthquakes in past 30 days)
      // - 4.5 (M4.5+ in past 30 days)
      // - 2.5 (M2.5+ in past 30 days)
      // - 1.0 (M1.0+ in past 30 days)
      // - all (all earthquakes in past 30 days)
      
      const magnitude = typeof minMagnitude === 'string' ? minMagnitude : String(minMagnitude);
      const url = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${magnitude}_month.geojson`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`USGS error: ${response.status}`);
      
      const data = await response.json();
      const earthquakes: USGSEarthquake[] = data.features || [];
      
      // Take most recent 50
      const recent = earthquakes.slice(0, 50);
      
      // Inject into globe
      globeDataFeed.injectPoints('earthquakes', recent);
      
    } catch (err) {
      console.error('[useEarthquakeData] Failed:', err);
    }
  }, [minMagnitude]);

  useEffect(() => {
    if (!enabled) return;
    
    void fetchEarthquakes();
    intervalRef.current = setInterval(fetchEarthquakes, refreshInterval);
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, refreshInterval, fetchEarthquakes]);

  return { refresh: fetchEarthquakes };
}
