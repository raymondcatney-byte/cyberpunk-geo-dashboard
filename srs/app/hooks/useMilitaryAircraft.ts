import { useEffect, useState, useCallback } from 'react';
import { globeDataFeed } from '../services/globeDataFeed';

interface Aircraft {
  hex: string;
  callsign: string;
  lat: number;
  lng: number;
  altitude: number;
  speed: number;
  heading: number;
  type: 'military' | 'transport' | 'civilian';
  country: string;
  squawk?: string;
  lastUpdate: number;
}

interface UseMilitaryAircraftOptions {
  enabled?: boolean;
  region?: string;
  refreshInterval?: number;
}

// Military aircraft type detection
function detectMilitaryType(callsign: string): { type: 'military' | 'transport' | 'civilian'; country: string } {
  const upperCall = callsign.toUpperCase();
  
  // US Military
  if (upperCall.startsWith('RCH') || upperCall.startsWith('CNV') || upperCall.startsWith('HOOK') || upperCall.startsWith('FADE')) {
    return { type: 'military', country: 'US' };
  }
  // NATO/Allied
  if (upperCall.startsWith('RRR') || upperCall.startsWith('BZZ') || upperCall.startsWith('KC')) {
    return { type: 'military', country: 'NATO' };
  }
  // Russian
  if (upperCall.startsWith('RSD') || upperCall.startsWith('RFF')) {
    return { type: 'military', country: 'RU' };
  }
  // Chinese
  if (upperCall.startsWith('CKK') || upperCall.startsWith('CSS')) {
    return { type: 'military', country: 'CN' };
  }
  // UK
  if (upperCall.startsWith('RR')) {
    return { type: 'military', country: 'UK' };
  }
  // France
  if (upperCall.startsWith('CTM') || upperCall.startsWith('FAF')) {
    return { type: 'military', country: 'FR' };
  }
  
  // Transport/Cargo (often military contractors)
  if (upperCall.startsWith('GTI') || upperCall.startsWith('CKS') || upperCall.startsWith('NCR')) {
    return { type: 'transport', country: 'Contractor' };
  }
  
  return { type: 'civilian', country: 'Unknown' };
}

// Region bounds for filtering
const REGION_BOUNDS: Record<string, { north: number; south: number; east: number; west: number }> = {
  'eastern_europe': { north: 60, south: 40, east: 50, west: 15 },
  'middle_east': { north: 40, south: 12, east: 63, west: 26 },
  'western_pacific': { north: 45, south: -10, east: 180, west: 100 },
  'baltic': { north: 65, south: 53, east: 30, west: 15 },
  'black_sea': { north: 48, south: 40, east: 42, west: 27 },
};

/**
 * Fetch and display military aircraft positions from ADS-B Exchange
 * Shows cyan markers for military flights
 */
export function useMilitaryAircraft(options: UseMilitaryAircraftOptions = {}) {
  const { enabled = true, region = 'eastern_europe', refreshInterval = 30000 } = options; // 30s for aircraft
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);

  const fetchAircraft = useCallback(async () => {
    if (!enabled) return;
    
    try {
      // Try to fetch from ADS-B Exchange or similar open API
      // Using ADSB.one free API (limited but functional)
      const bounds = REGION_BOUNDS[region] || REGION_BOUNDS['eastern_europe'];
      
      // Construct URL for ADSB.one API
      const centerLat = (bounds.north + bounds.south) / 2;
      const centerLng = (bounds.east + bounds.west) / 2;
      const radius = Math.max(
        Math.abs(bounds.north - bounds.south),
        Math.abs(bounds.east - bounds.west)
      ) * 55; // Rough conversion to km
      
      const url = `https://api.adsb.one/v2/lat/${centerLat.toFixed(4)}/lon/${centerLng.toFixed(4)}/dist/${Math.min(radius, 250)}`;
      
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      
      if (!response.ok) {
        // Fall back to mock data
        throw new Error('ADS-B API unavailable');
      }
      
      const data = await response.json() as { 
        ac?: Array<{
          hex: string;
          flight?: string;
          lat?: number;
          lon?: number;
          alt_baro?: number;
          gs?: number;
          track?: number;
          squawk?: string;
        }> 
      };
      
      const acList = data.ac || [];
      
      // Filter for military/transports and map
      const militaryAircraft: Aircraft[] = acList
        .filter(ac => ac.flight && ac.lat && ac.lon)
        .map(ac => {
          const detection = detectMilitaryType(ac.flight || '');
          return {
            hex: ac.hex,
            callsign: (ac.flight || 'UNKNOWN').trim(),
            lat: ac.lat!,
            lng: ac.lon!,
            altitude: ac.alt_baro || 0,
            speed: ac.gs || 0,
            heading: ac.track || 0,
            type: detection.type,
            country: detection.country,
            squawk: ac.squawk,
            lastUpdate: Date.now(),
          };
        })
        .filter(ac => ac.type === 'military' || ac.type === 'transport');
      
      setAircraft(militaryAircraft);
      
      // Convert to globe points
      const points = militaryAircraft.map(ac => ({
        id: `aircraft-${ac.hex}`,
        lat: ac.lat,
        lng: ac.lng,
        layer: 'flights' as const,
        timestamp: ac.lastUpdate,
        color: ac.type === 'military' ? '#06b6d4' : '#f59e0b', // Cyan for military, amber for transport
        size: 0.12,
        opacity: 0.9,
        heading: ac.heading,
        speed: ac.speed,
        title: `${ac.callsign} (${ac.country})`,
        description: `Alt: ${Math.round(ac.altitude / 1000)}k ft | Speed: ${Math.round(ac.speed)} kts | HDG: ${Math.round(ac.heading)}°`,
        category: ac.type === 'military' ? 'Military' : 'Transport',
        severity: ac.squawk === '7700' ? 'critical' : ac.squawk === '7600' ? 'high' : 'info',
        makaveliQuery: `Analyze ${ac.country} ${ac.type} flight ${ac.callsign}: ${ac.country} military activity`,
      }));
      
      globeDataFeed.injectPoints('flights', points);
      
      console.log(`[useMilitaryAircraft] Tracked ${points.length} military aircraft`);
    } catch (error) {
      // Use mock data on error
      console.log('[useMilitaryAircraft] Using mock data');
      useMockAircraft(region, setAircraft);
    }
  }, [enabled, region]);

  useEffect(() => {
    fetchAircraft();
    
    if (!refreshInterval) return;
    const interval = setInterval(fetchAircraft, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchAircraft, refreshInterval]);

  return { aircraft };
}

// Mock aircraft for development
function useMockAircraft(
  region: string, 
  setAircraft: React.Dispatch<React.SetStateAction<Aircraft[]>>
) {
  const bounds = REGION_BOUNDS[region] || REGION_BOUNDS['eastern_europe'];
  
  const mockAircraft: Aircraft[] = [
    {
      hex: 'ae1234',
      callsign: 'RCH452', // US Air Mobility Command
      lat: bounds.south + Math.random() * (bounds.north - bounds.south),
      lng: bounds.west + Math.random() * (bounds.east - bounds.west),
      altitude: 32000,
      speed: 450,
      heading: 45 + Math.random() * 90,
      type: 'military',
      country: 'US',
      lastUpdate: Date.now(),
    },
    {
      hex: 'ae5678',
      callsign: 'RCH891', // US transport
      lat: bounds.south + Math.random() * (bounds.north - bounds.south),
      lng: bounds.west + Math.random() * (bounds.east - bounds.west),
      altitude: 28000,
      speed: 420,
      heading: 180 + Math.random() * 90,
      type: 'military',
      country: 'US',
      lastUpdate: Date.now(),
    },
    {
      hex: '43c123',
      callsign: 'RRR1234', // RAF
      lat: bounds.south + Math.random() * (bounds.north - bounds.south),
      lng: bounds.west + Math.random() * (bounds.east - bounds.west),
      altitude: 25000,
      speed: 380,
      heading: 270 + Math.random() * 90,
      type: 'military',
      country: 'UK',
      lastUpdate: Date.now(),
    },
  ];
  
  setAircraft(mockAircraft);
  
  const points = mockAircraft.map(ac => ({
    id: `aircraft-${ac.hex}`,
    lat: ac.lat,
    lng: ac.lng,
    layer: 'flights' as const,
    timestamp: ac.lastUpdate,
    color: '#06b6d4',
    size: 0.12,
    opacity: 0.9,
    heading: ac.heading,
    speed: ac.speed,
    title: `${ac.callsign} (${ac.country})`,
    description: `Alt: ${Math.round(ac.altitude / 1000)}k ft | Speed: ${Math.round(ac.speed)} kts`,
    category: 'Military',
    severity: 'info' as const,
    makaveliQuery: `Analyze ${ac.country} military flight ${ac.callsign}`,
  }));
  
  globeDataFeed.injectPoints('flights', points);
}
