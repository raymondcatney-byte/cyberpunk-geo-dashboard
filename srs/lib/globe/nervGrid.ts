// NERV Tactical Coordinate Grid Generator
// Creates the wireframe lat/lng grid seen in Evangelion command center

export interface GridLine {
  type: 'LineString';
  coordinates: [number, number][];
}

/**
 * Generate NERV tactical coordinate grid
 * @param step Degrees between grid lines (default: 10)
 * @returns Array of GeoJSON LineString features
 */
export function generateNervGrid(step: number = 10): GridLine[] {
  const lines: GridLine[] = [];

  // Longitude lines (Vertical) - from -180 to 180
  for (let lng = -180; lng <= 180; lng += step) {
    lines.push({
      type: 'LineString',
      coordinates: [
        [lng, -90],
        [lng, 90]
      ]
    });
  }

  // Latitude lines (Horizontal) - from -90 to 90
  for (let lat = -90; lat <= 90; lat += step) {
    lines.push({
      type: 'LineString',
      coordinates: [
        [-180, lat],
        [180, lat]
      ]
    });
  }

  return lines;
}

/**
 * Generate a denser grid for high-zoom tactical views
 * @returns Array of GeoJSON LineString features (5 degree step)
 */
export function generateNervGridDense(): GridLine[] {
  return generateNervGrid(5);
}

/**
 * Generate polar coordinate rings for strategic overview
 * @param rings Number of concentric rings
 * @returns Array of GeoJSON LineString features
 */
export function generatePolarGrid(rings: number = 5): GridLine[] {
  const lines: GridLine[] = [];
  
  for (let i = 1; i <= rings; i++) {
    const lat = 90 - (i * (90 / (rings + 1)));
    lines.push({
      type: 'LineString',
      coordinates: Array.from({ length: 73 }, (_, j) => [
        -180 + j * 5,
        lat
      ])
    });
  }
  
  return lines;
}

// NERV Color System for globe
export const NERV_GLOBE_COLORS = {
  wireCyan: '#20F0FF',
  nervOrange: '#FF9830',
  alertRed: '#FF3030',
  dataGreen: '#50FF50',
  blackVoid: '#000000',
  faintCyan: 'rgba(32, 240, 255, 0.2)',
  faintOrange: 'rgba(255, 152, 48, 0.3)',
  faintRed: 'rgba(255, 48, 48, 0.4)',
} as const;

// Atmosphere states for MAGI integration
export type AtmosphereState = 'nominal' | 'caution' | 'emergency' | 'searching';

export const ATMOSPHERE_COLORS: Record<AtmosphereState, string> = {
  nominal: NERV_GLOBE_COLORS.wireCyan,    // Normal operation
  caution: NERV_GLOBE_COLORS.nervOrange,  // Warning/disagreement
  emergency: NERV_GLOBE_COLORS.alertRed,  // Critical
  searching: NERV_GLOBE_COLORS.nervOrange // During lock-on transition
};

export const PATH_COLORS: Record<AtmosphereState, string> = {
  nominal: NERV_GLOBE_COLORS.faintCyan,
  caution: 'rgba(255, 152, 48, 0.3)',
  emergency: NERV_GLOBE_COLORS.faintRed,
  searching: 'rgba(255, 152, 48, 0.4)'
};
