/**
 * useVesselTracking - Example: AIS Maritime Tracking
 * Fetches vessel positions and injects into globeDataFeed
 * 
 * NO UI CHANGES - purely data injection
 */

import { useEffect, useCallback, useRef } from 'react';
import { globeDataFeed } from '../services/globeDataFeed';

interface AISVessel {
  mmsi: string;
  name?: string;
  lat: number;
  lng: number;
  speed?: number;      // knots
  heading?: number;    // degrees
  vesselType?: string;
  destination?: string;
}

interface UseVesselTrackingOptions {
  enabled?: boolean;
  refreshInterval?: number;  // ms
  region?: 'global' | 'red_sea' | 'south_china_sea' | 'mediterranean';
}

export function useVesselTracking(options: UseVesselTrackingOptions = {}) {
  const { enabled = true, refreshInterval = 30000, region = 'global' } = options;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch vessel data
  const fetchVessels = useCallback(async () => {
    try {
      // OPTION 1: Free AIS API (MarineTraffic has limited free tier)
      // const response = await fetch(`https://services.marinetraffic.com/api/exportvessels/v:8/${API_KEY}/protocol:json/timespan:10`);
      
      // Use consolidated intel-feeds endpoint
      const response = await fetch(`/api/intel-feeds?feed=vessels&region=${region}`);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data: AISVessel[] = await response.json();
      
      // Transform and inject into globe
      // The transformer is already registered in globeDataFeed
      globeDataFeed.injectPoints('vessels', data);
      
    } catch (err) {
      console.error('[useVesselTracking] Failed to fetch:', err);
      // Feed maintains last known data on error
    }
  }, [region]);

  // Setup polling
  useEffect(() => {
    if (!enabled) return;
    
    // Initial fetch
    void fetchVessels();
    
    // Start polling
    intervalRef.current = setInterval(fetchVessels, refreshInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, refreshInterval, fetchVessels]);

  // Manual refresh function
  const refresh = useCallback(() => {
    return fetchVessels();
  }, [fetchVessels]);

  return { refresh };
}
