/**
 * OpenSky Network ADS-B Flight Tracking
 * Free API - no key required for anonymous access
 * Rate limit: 100 requests/day (perfect for ~15 min polling)
 */

export interface AircraftState {
  icao24: string; // Unique aircraft ID
  callsign: string | null; // Flight number (nullable)
  origin_country: string;
  longitude: number;
  latitude: number;
  altitude: number; // meters
  velocity: number; // m/s
  heading: number; // degrees (0-360)
  vertical_rate: number; // m/s (positive = climbing)
  on_ground: boolean;
  last_contact: number; // Unix timestamp
}

interface OpenSkyResponse {
  time: number;
  states: Array<
    [
      string, // icao24
      string | null, // callsign
      string, // origin_country
      number | null, // time_position
      number | null, // last_contact
      number | null, // longitude
      number | null, // latitude
      number | null, // altitude
      boolean | null, // on_ground
      number | null, // velocity
      number | null, // heading
      number | null, // vertical_rate
      number[] | null, // sensors
      number | null, // geo_altitude
      string | null // squawk
    ]
  > | null;
}

// Cache for aircraft data
let cachedAircraft: AircraftState[] = [];
let lastFetch = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Fetch aircraft states from OpenSky Network
 * Returns cached data if available and fresh
 */
export async function fetchAircraftStates(
  lamin?: number,
  lomin?: number,
  lamax?: number,
  lomax?: number
): Promise<AircraftState[]> {
  const now = Date.now();
  
  // Return cached data if fresh
  if (cachedAircraft.length > 0 && now - lastFetch < CACHE_TTL) {
    return cachedAircraft;
  }

  try {
    // Build URL with optional bounding box
    let url = 'https://opensky-network.org/api/states/all';
    const params = new URLSearchParams();
    
    if (lamin !== undefined) params.append('lamin', lamin.toString());
    if (lomin !== undefined) params.append('lomin', lomin.toString());
    if (lamax !== undefined) params.append('lamax', lamax.toString());
    if (lomax !== undefined) params.append('lomax', lomax.toString());
    
    if (params.toString()) {
      url += '?' + params.toString();
    }

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OpenSky API error: ${response.status}`);
    }

    const data: OpenSkyResponse = await response.json();
    
    if (!data.states || !Array.isArray(data.states)) {
      cachedAircraft = [];
      return [];
    }

    // Transform raw data to typed objects
    const aircraft: AircraftState[] = data.states
      .filter((state) => state[5] !== null && state[6] !== null) // Must have lat/lng
      .map((state) => ({
        icao24: state[0],
        callsign: state[1]?.trim() || null,
        origin_country: state[2],
        longitude: state[5]!,
        latitude: state[6]!,
        altitude: state[7] ?? 0,
        velocity: state[9] ?? 0,
        heading: state[10] ?? 0,
        vertical_rate: state[11] ?? 0,
        on_ground: state[8] ?? false,
        last_contact: state[4] ?? Date.now() / 1000,
      }));

    cachedAircraft = aircraft;
    lastFetch = now;
    
    return aircraft;
  } catch (error) {
    console.error('Failed to fetch aircraft data:', error);
    // Return stale cache if available, otherwise empty
    return cachedAircraft;
  }
}

/**
 * Get aircraft statistics
 */
export function getAircraftStats(aircraft: AircraftState[]) {
  const total = aircraft.length;
  const onGround = aircraft.filter((a) => a.on_ground).length;
  const inAir = total - onGround;
  const byCountry = aircraft.reduce((acc, a) => {
    acc[a.origin_country] = (acc[a.origin_country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Top 5 countries by aircraft count
  const topCountries = Object.entries(byCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    total,
    onGround,
    inAir,
    topCountries,
  };
}

/**
 * Filter aircraft by region
 */
export function filterAircraftByRegion(
  aircraft: AircraftState[],
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }
): AircraftState[] {
  return aircraft.filter(
    (a) =>
      a.latitude <= bounds.north &&
      a.latitude >= bounds.south &&
      a.longitude <= bounds.east &&
      a.longitude >= bounds.west
  );
}

// Pre-defined regions of interest
export const REGIONS = {
  global: null,
  north_america: { north: 70, south: 15, east: -50, west: -170 },
  south_america: { north: 15, south: -60, east: -30, west: -90 },
  europe: { north: 75, south: 35, east: 45, west: -15 },
  middle_east: { north: 45, south: 12, east: 65, west: 25 },
  asia_pacific: { north: 75, south: -10, east: 180, west: 60 },
  africa: { north: 40, south: -40, east: 55, west: -20 },
} as const;

export type RegionKey = keyof typeof REGIONS;
