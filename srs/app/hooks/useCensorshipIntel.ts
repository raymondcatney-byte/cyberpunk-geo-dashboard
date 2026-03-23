import { useEffect, useCallback } from 'react';
import { globeDataFeed } from '../services/globeDataFeed';

interface UseCensorshipIntelOptions {
  enabled?: boolean;
  country?: string;
  refreshInterval?: number;
}

// Country coordinates for mapping
const COUNTRY_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  'RU': { lat: 61.5240, lng: 105.3188, name: 'Russia' },
  'CN': { lat: 35.8617, lng: 104.1954, name: 'China' },
  'IR': { lat: 32.4279, lng: 53.6880, name: 'Iran' },
  'KP': { lat: 40.3399, lng: 127.5101, name: 'North Korea' },
  'EG': { lat: 26.8206, lng: 30.8025, name: 'Egypt' },
  'TR': { lat: 38.9637, lng: 35.2433, name: 'Turkey' },
  'IN': { lat: 20.5937, lng: 78.9629, name: 'India' },
  'PK': { lat: 30.3753, lng: 69.3451, name: 'Pakistan' },
  'VN': { lat: 14.0583, lng: 108.2772, name: 'Vietnam' },
  'BY': { lat: 53.7098, lng: 27.9534, name: 'Belarus' },
  'VE': { lat: 6.4238, lng: -66.5897, name: 'Venezuela' },
  'CU': { lat: 21.5218, lng: -77.7812, name: 'Cuba' },
  'MM': { lat: 21.9139, lng: 95.9560, name: 'Myanmar' },
  'SA': { lat: 23.8859, lng: 45.0792, name: 'Saudi Arabia' },
  'AE': { lat: 23.4241, lng: 53.8478, name: 'UAE' },
  'TH': { lat: 15.8700, lng: 100.9925, name: 'Thailand' },
  'BD': { lat: 23.6850, lng: 90.3563, name: 'Bangladesh' },
  'ET': { lat: 9.1450, lng: 40.4897, name: 'Ethiopia' },
};

/**
 * Fetch and display OONI censorship measurements on the globe
 * Shows purple hex markers where internet restrictions detected
 */
export function useCensorshipIntel(options: UseCensorshipIntelOptions = {}) {
  const { enabled = true, country, refreshInterval = 600000 } = options; // 10 min default

  const fetchCensorshipData = useCallback(async () => {
    if (!enabled) return;
    
    try {
      const url = new URL('/api/intel-feeds', window.location.origin);
      url.searchParams.set('feed', 'ooni');
      if (country) url.searchParams.set('country', country);
      
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (!data.ok) throw new Error(data.error);
      
      // Convert OONI stats to globe points
      const points = (data.stats || []) 
        .filter((stat: any) => stat.confirmed_count > 0 || stat.anomaly_count > 2)
        .map((stat: any) => {
          const coords = COUNTRY_COORDS[stat.probe_cc] || { lat: 0, lng: 0, name: stat.probe_cc };
          const severity = stat.confirmed_count > 5 ? 'critical' : 
                          stat.confirmed_count > 0 ? 'high' : 'medium';
          
          return {
            id: `censorship-${stat.probe_cc}`,
            lat: coords.lat,
            lng: coords.lng,
            layer: 'cyber' as const,
            timestamp: Date.now(),
            color: stat.confirmed_count > 0 ? '#a855f7' : '#8b5cf6', // Purple for censorship
            size: Math.max(0.15, Math.min(0.4, (stat.confirmed_count + stat.anomaly_count) / 10)),
            opacity: 0.7,
            pulse: stat.confirmed_count > 0,
            title: `Internet Censorship: ${coords.name}`,
            description: `Confirmed blocks: ${stat.confirmed_count} | Anomalies: ${stat.anomaly_count} | Total tests: ${stat.measurement_count}`,
            category: 'Information Control',
            severity,
            makaveliQuery: `Assess censorship escalation in ${coords.name}: ${stat.confirmed_count} confirmed blocks detected`,
          };
        });
      
      // Inject into globe data feed
      globeDataFeed.injectPoints('cyber', points);
      
      console.log(`[useCensorshipIntel] Injected ${points.length} censorship markers`);
    } catch (error) {
      console.error('[useCensorshipIntel] Failed to fetch:', error);
    }
  }, [enabled, country]);

  useEffect(() => {
    fetchCensorshipData();
    
    if (!refreshInterval) return;
    const interval = setInterval(fetchCensorshipData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchCensorshipData, refreshInterval]);
}
