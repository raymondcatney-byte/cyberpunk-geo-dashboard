// Types for hex heatmap globe

export interface HexCell {
  id: number;
  lat: number;
  lng: number;
  intensity: number; // 0-1 based on market activity
  region: string;
  marketCount: number;
  volume: number;
}

export interface CityMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
  volume: number;
  marketCount: number;
}

export interface HexHeatmapGlobeHandle {
  flyTo: (lat: number, lng: number, label?: string) => void;
}

// Major financial centers for yellow markers
export const FINANCIAL_CENTERS: CityMarker[] = [
  { id: 'nyc', name: 'New York', lat: 40.7128, lng: -74.0060, region: 'North America', volume: 0, marketCount: 0 },
  { id: 'london', name: 'London', lat: 51.5074, lng: -0.1278, region: 'Europe', volume: 0, marketCount: 0 },
  { id: 'tokyo', name: 'Tokyo', lat: 35.6762, lng: 139.6503, region: 'Asia', volume: 0, marketCount: 0 },
  { id: 'singapore', name: 'Singapore', lat: 1.3521, lng: 103.8198, region: 'Asia', volume: 0, marketCount: 0 },
  { id: 'dubai', name: 'Dubai', lat: 25.2048, lng: 55.2708, region: 'Middle East', volume: 0, marketCount: 0 },
  { id: 'hongkong', name: 'Hong Kong', lat: 22.3193, lng: 114.1694, region: 'Asia', volume: 0, marketCount: 0 },
  { id: 'sydney', name: 'Sydney', lat: -33.8688, lng: 151.2093, region: 'Oceania', volume: 0, marketCount: 0 },
  { id: 'sao-paulo', name: 'São Paulo', lat: -23.5505, lng: -46.6333, region: 'South America', volume: 0, marketCount: 0 },
  { id: 'zurich', name: 'Zurich', lat: 47.3769, lng: 8.5417, region: 'Europe', volume: 0, marketCount: 0 },
  { id: 'mumbai', name: 'Mumbai', lat: 19.0760, lng: 72.8777, region: 'Asia', volume: 0, marketCount: 0 },
  { id: 'toronto', name: 'Toronto', lat: 43.6532, lng: -79.3832, region: 'North America', volume: 0, marketCount: 0 },
  { id: 'frankfurt', name: 'Frankfurt', lat: 50.1109, lng: 8.6821, region: 'Europe', volume: 0, marketCount: 0 },
];
