// Type definitions for NERV Globe

export interface GlobeInstance {
  atmosphereColor(color: string): GlobeInstance;
  pathColor(fn: () => string): GlobeInstance;
  pointOfView(coords: { lat: number; lng: number; altitude?: number }, duration?: number): GlobeInstance;
  _buildCallbacks: unknown;
}

export interface HexBinData {
  points: Array<{
    lat: number;
    lng: number;
    intensity: number;
    type: string;
    label?: string;
  }>;
  sumWeight: number;
  center: { lat: number; lng: number };
}

export interface GlobePoint {
  lat: number;
  lng: number;
  color?: string;
  type?: string;
  label?: string;
  severity?: string;
}

export interface GlobeArc {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  width?: number;
  color?: string;
  label?: string;
}
