/**
 * Data APIs for live layers
 * All free, no API keys required
 */

// Aircraft types
export interface Aircraft {
  hex: string;
  lat: number;
  lon: number;
  altitude: number;
  speed: number;
  heading: number;
  flight?: string;
  type?: string;
  updated: number;
}

// Satellite types
export interface Satellite {
  id: string;
  name: string;
  lat: number;
  lon: number;
  altitude: number;
  velocity: number;
  type: 'military' | 'commercial' | 'navigation' | 'weather' | 'other';
}

// Earthquake types
export interface Earthquake {
  id: string;
  lat: number;
  lon: number;
  magnitude: number;
  depth: number;
  place: string;
  time: number;
  alert?: 'green' | 'yellow' | 'orange' | 'red';
}

/**
 * Fetch aircraft from adsb.lol API
 * Free, no key required
 */
export async function fetchAircraft(bounds?: {
  north: number;
  south: number;
  east: number;
  west: number;
}): Promise<Aircraft[]> {
  try {
    let url = 'https://api.adsb.lol/v2/points';
    if (bounds) {
      const lat = (bounds.north + bounds.south) / 2;
      const lon = (bounds.east + bounds.west) / 2;
      const radius = Math.max(
        Math.abs(bounds.north - bounds.south),
        Math.abs(bounds.east - bounds.west)
      ) * 55; // approximate nm
      url = `https://api.adsb.lol/v2/point/${lat}/${lon}/${Math.min(radius, 250)}`;
    }

    const res = await fetch(url, { 
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    return (data.aircraft || data.ac || []).map((ac: any) => ({
      hex: ac.hex || ac.icao24 || '',
      lat: ac.lat,
      lon: ac.lon,
      altitude: ac.alt_baro || ac.altitude || 0,
      speed: ac.gs || ac.speed || 0,
      heading: ac.track || ac.heading || 0,
      flight: ac.flight?.trim() || ac.callsign?.trim() || undefined,
      type: ac.t || ac.type,
      updated: Date.now(),
    })).filter((ac: Aircraft) => ac.lat && ac.lon);
  } catch (err) {
    console.error('Aircraft fetch failed:', err);
    return [];
  }
}

/**
 * Fetch satellites from consolidated API
 * Cached server-side to avoid CORS and rate limits
 */
export async function fetchSatellites(): Promise<Satellite[]> {
  try {
    const res = await fetch('/api/intel-feeds?feed=satellites', {
      signal: AbortSignal.timeout(15000)
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    if (!data.ok) throw new Error(data.error || 'API error');
    return data.satellites || [];
  } catch (err) {
    console.error('Satellite fetch failed:', err);
    // Return mock data for visualization
    return generateMockSatellites();
  }
}

function classifySatellite(name: string): Satellite['type'] {
  const n = name.toLowerCase();
  if (n.includes('gps') || n.includes('glonass') || n.includes('galileo') || n.includes('beidou')) return 'navigation';
  if (n.includes('goes') || n.includes('meteosat') || n.includes('weather')) return 'weather';
  if (n.includes('military') || n.includes('usa') || n.includes('usaf') || n.includes('nrol')) return 'military';
  if (n.includes('starlink') || n.includes('oneweb') || n.includes('iridium')) return 'commercial';
  return 'other';
}

function generateMockSatellites(): Satellite[] {
  const types: Satellite['type'][] = ['military', 'commercial', 'navigation', 'weather', 'other'];
  return Array.from({ length: 30 }, (_, i) => ({
    id: `sat-${i}`,
    name: `SAT-${i + 100}`,
    lat: Math.sin(i * 0.5) * 60,
    lon: (i * 12) % 360 - 180,
    altitude: 400000 + Math.random() * 200000,
    velocity: 7.66,
    type: types[i % types.length],
  }));
}

/**
 * Fetch earthquakes from USGS API
 * Free, no key required
 */
export async function fetchEarthquakes(minMagnitude = 2.5): Promise<Earthquake[]> {
  try {
    const url = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${minMagnitude}_day.geojson`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000)
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    return (data.features || []).map((eq: any) => ({
      id: eq.id,
      lat: eq.geometry.coordinates[1],
      lon: eq.geometry.coordinates[0],
      magnitude: eq.properties.mag,
      depth: eq.geometry.coordinates[2],
      place: eq.properties.place,
      time: eq.properties.time,
      alert: eq.properties.alert,
    }));
  } catch (err) {
    console.error('Earthquake fetch failed:', err);
    return [];
  }
}
