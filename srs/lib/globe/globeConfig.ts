// Globe Configuration - NERV/Sentinel aesthetic

export interface GlobeConfig {
  // Visual settings
  backgroundColor: string;
  atmosphereColor: string;
  atmosphereAltitude: number;
  globeColor: string;
  
  // Marker settings
  markerColor: string;
  markerAltitude: number;
  markerRadius: number;
  
  // Animation
  autoRotate: boolean;
  autoRotateSpeed: number;
  
  // Interactions
  enableZoom: boolean;
  enablePan: boolean;
}

export const DEFAULT_GLOBE_CONFIG: GlobeConfig = {
  backgroundColor: '#00000000', // transparent
  atmosphereColor: '#ff6b0080', // NERV orange with opacity
  atmosphereAltitude: 0.15,
  globeColor: '#0a0a0a',
  
  markerColor: '#ff6b00',
  markerAltitude: 0.01,
  markerRadius: 0.5,
  
  autoRotate: true,
  autoRotateSpeed: 0.5,
  
  enableZoom: true,
  enablePan: true,
};

// Earth texture URLs (dark/tech aesthetic)
export const EARTH_TEXTURES = {
  // Dark earth without clouds
  dark: 'https://unpkg.com/three-globe/example/img/earth-dark.jpg',
  // Blue marble (NASA)
  blueMarble: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
  // Topology/bump map
  topology: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
};

// Hex polygon colors for heatmap
export const HEX_COLORS = {
  low: '#1a1a2e',
  medium: '#16213e', 
  high: '#0f3460',
  critical: '#e94560',
};

// Focal point types with their visual properties
export const FOCAL_POINT_STYLES = {
  geopolitical: {
    color: '#ff6b00', // NERV orange
    pulseColor: '#ffaa00',
    size: 1.2,
  },
  economic: {
    color: '#00d4ff', // Cyan
    pulseColor: '#88eeff',
    size: 1.0,
  },
  conflict: {
    color: '#ff0040', // Red
    pulseColor: '#ff6080',
    size: 1.5,
  },
  biotech: {
    color: '#00ff88', // Green
    pulseColor: '#88ffaa',
    size: 1.0,
  },
};

export type FocalPointType = keyof typeof FOCAL_POINT_STYLES;
