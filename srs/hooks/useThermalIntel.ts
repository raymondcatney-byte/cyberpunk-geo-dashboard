import { useEffect, useCallback } from 'react';
import { globeDataFeed } from '../services/globeDataFeed';

interface UseThermalIntelOptions {
  enabled?: boolean;
  region?: string;
  days?: number;
  refreshInterval?: number;
}

/**
 * Fetch and display NASA FIRMS thermal signatures (fires, strikes, explosions)
 * on the globe as red heat markers
 */
export function useThermalIntel(options: UseThermalIntelOptions = {}) {
  const { enabled = true, region, days = 1, refreshInterval = 300000 } = options; // 5 min default

  const fetchThermalData = useCallback(async () => {
    if (!enabled) return;
    
    try {
      const url = new URL('/api/intel-feeds', window.location.origin);
      url.searchParams.set('feed', 'firms');
      if (region) url.searchParams.set('region', region);
      url.searchParams.set('days', String(days));
      
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (!data.ok) throw new Error(data.error);
      
      // Convert FIRMS detections to globe points
      const points = (data.detections || []).map((detection: any) => ({
        id: `thermal-${detection.id}`,
        lat: detection.latitude,
        lng: detection.longitude,
        layer: 'conflicts' as const, // Use conflicts layer for thermal signatures
        timestamp: new Date(`${detection.acq_date}T${detection.acq_time}`).getTime(),
        color: detection.confidence === 'high' ? '#ff0000' : 
               detection.confidence === 'nominal' ? '#ff6600' : '#ffaa00',
        size: Math.max(0.2, Math.min(0.6, (detection.frp || 10) / 50)), // Size based on fire radiative power
        opacity: 0.8,
        pulse: detection.confidence === 'high',
        title: `Thermal Signature (${detection.confidence})`,
        description: `Brightness: ${detection.brightness.toFixed(1)}K | FRP: ${detection.frp}MW | Satellite: ${detection.satellite}`,
        category: detection.daynight === 'N' ? 'Night Strike' : 'Thermal Anomaly',
        severity: detection.confidence === 'high' ? 'critical' : 
                  detection.confidence === 'nominal' ? 'high' : 'medium',
        makaveliQuery: `Analyze thermal signature at ${detection.latitude.toFixed(2)}, ${detection.longitude.toFixed(2)}: Possible strike or fire?`,
      }));
      
      // Inject into globe data feed
      globeDataFeed.injectPoints('conflicts', points);
      
      console.log(`[useThermalIntel] Injected ${points.length} thermal signatures`);
    } catch (error) {
      console.error('[useThermalIntel] Failed to fetch:', error);
    }
  }, [enabled, region, days]);

  useEffect(() => {
    fetchThermalData();
    
    if (!refreshInterval) return;
    const interval = setInterval(fetchThermalData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchThermalData, refreshInterval]);
}
