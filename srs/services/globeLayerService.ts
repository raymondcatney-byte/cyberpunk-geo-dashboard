/**
 * Globe Layer Service - War Room Strategic Data Layers
 * Adds economic zones, trade routes, and heat maps to the globe
 */

import * as THREE from 'three';

// Trade route chokepoints - critical maritime passages
export const TRADE_ROUTES = {
  // Strait of Hormuz - Oil transit chokepoint
  hormuz: {
    name: 'Strait of Hormuz',
    type: 'chokepoint' as const,
    path: [
      { lat: 26.5, lng: 56.25 },
      { lat: 26.5, lng: 56.5 },
    ],
    importance: 'critical',
    throughput: '21M barrels/day',
    riskFactors: ['Iran tensions', 'Piracy', 'Regional conflict'],
  },
  // Strait of Malacca - Asia trade gateway
  malacca: {
    name: 'Strait of Malacca',
    type: 'chokepoint' as const,
    path: [
      { lat: 1.5, lng: 103.0 },
      { lat: 3.5, lng: 100.5 },
    ],
    importance: 'critical',
    throughput: '$3T annual trade',
    riskFactors: ['Piracy', 'Congestion', 'China-US tensions'],
  },
  // Suez Canal
  suez: {
    name: 'Suez Canal',
    type: 'chokepoint' as const,
    path: [
      { lat: 30.0, lng: 32.5 },
      { lat: 30.0, lng: 32.6 },
    ],
    importance: 'critical',
    throughput: '12% global trade',
    riskFactors: ['Blockage risk', 'Regional instability', 'Houthi attacks'],
  },
  // Panama Canal
  panama: {
    name: 'Panama Canal',
    type: 'chokepoint' as const,
    path: [
      { lat: 9.0, lng: -79.5 },
      { lat: 9.1, lng: -79.7 },
    ],
    importance: 'high',
    throughput: '5% global trade',
    riskFactors: ['Drought restrictions', 'Geopolitical competition'],
  },
  // Bab el-Mandeb
  babElMandeb: {
    name: 'Bab el-Mandeb',
    type: 'chokepoint' as const,
    path: [
      { lat: 12.5, lng: 43.2 },
      { lat: 12.6, lng: 43.3 },
    ],
    importance: 'critical',
    throughput: '4.8M barrels/day',
    riskFactors: ['Houthi attacks', 'Red Sea crisis', 'Regional war'],
  },
  // Turkish Straits
  turkishStraits: {
    name: 'Turkish Straits',
    type: 'chokepoint' as const,
    path: [
      { lat: 41.0, lng: 29.0 },
      { lat: 41.2, lng: 29.2 },
    ],
    importance: 'high',
    throughput: '3M barrels/day',
    riskFactors: ['Geopolitical tensions', 'Russia sanctions'],
  },
};

// Economic zones - major trade/manufacturing hubs
export const ECONOMIC_ZONES = [
  // Asia-Pacific
  { name: 'Greater Bay Area', lat: 22.3, lng: 114.0, type: 'manufacturing', importance: 'critical' },
  { name: 'Yangtze River Delta', lat: 31.2, lng: 121.5, type: 'manufacturing', importance: 'critical' },
  { name: 'Tokyo Bay', lat: 35.6, lng: 140.0, type: 'finance', importance: 'critical' },
  { name: 'Seoul Metro', lat: 37.5, lng: 127.0, type: 'tech', importance: 'high' },
  { name: 'Singapore Hub', lat: 1.35, lng: 103.8, type: 'trade', importance: 'critical' },
  // Europe
  { name: 'Rhine-Ruhr', lat: 51.2, lng: 6.8, type: 'manufacturing', importance: 'high' },
  { name: 'Randstad', lat: 52.1, lng: 4.9, type: 'trade', importance: 'high' },
  { name: 'London Finance', lat: 51.5, lng: -0.1, type: 'finance', importance: 'critical' },
  // Americas
  { name: 'Northeast Corridor', lat: 40.7, lng: -74.0, type: 'finance', importance: 'critical' },
  { name: 'Mexico Manufacturing', lat: 25.7, lng: -100.3, type: 'manufacturing', importance: 'high' },
  { name: 'São Paulo Hub', lat: -23.5, lng: -46.6, type: 'resources', importance: 'medium' },
  // Middle East
  { name: 'Dubai Trade', lat: 25.2, lng: 55.3, type: 'trade', importance: 'high' },
  { name: 'Saudi Industrial', lat: 24.7, lng: 46.7, type: 'resources', importance: 'critical' },
];

// Critical infrastructure - undersea cables, pipelines, power grids
export const INFRASTRUCTURE = {
  // Undersea cable landing points (major)
  cables: [
    { name: 'FLAG Europe-Asia', lat: 51.5, lng: -0.1, endpoints: ['UK', 'Japan'] },
    { name: 'SEA-ME-WE 3', lat: 1.35, lng: 103.8, endpoints: ['Singapore', 'Europe'] },
    { name: 'MAREA', lat: 40.4, lng: -3.7, endpoints: ['Spain', 'Virginia'] },
    { name: 'FASTER', lat: 35.6, lng: 140.0, endpoints: ['Japan', 'US'] },
    { name: '2Africa', lat: 33.9, lng: -6.8, endpoints: ['Morocco', 'Multiple'] },
    { name: 'Trans-Pacific', lat: 37.8, lng: -122.4, endpoints: ['California', 'Asia'] },
  ],
  // Major pipelines
  pipelines: [
    { name: 'Nord Stream (disabled)', lat: 54.5, lng: 15.5, status: 'damaged', type: 'gas' },
    { name: 'Southern Gas Corridor', lat: 40.5, lng: 50.0, status: 'active', type: 'gas' },
    { name: 'Power of Siberia', lat: 55.0, lng: 120.0, status: 'active', type: 'gas' },
    { name: 'Druzhba Pipeline', lat: 52.0, lng: 23.0, status: 'reduced', type: 'oil' },
    { name: 'Baku-Tbilisi-Ceyhan', lat: 41.0, lng: 45.0, status: 'active', type: 'oil' },
  ],
  // Power grid interconnectors
  power: [
    { name: 'Europe Grid', lat: 50.0, lng: 10.0, region: 'ENTSO-E', capacity: '600GW' },
    { name: 'US Grid East', lat: 40.0, lng: -77.0, region: 'PJM', capacity: '165GW' },
    { name: 'China Grid', lat: 35.0, lng: 105.0, region: 'State Grid', capacity: '1100GW' },
  ],
};

// Military installations (public domain data)
export const MILITARY_BASES = [
  // US
  { name: 'Naval Station Norfolk', lat: 36.9, lng: -76.3, country: 'US', type: 'naval' },
  { name: 'Camp Humphreys', lat: 36.9, lng: 127.0, country: 'US', type: 'army' },
  { name: 'Ramstein AB', lat: 49.4, lng: 7.6, country: 'US', type: 'air' },
  { name: 'Diego Garcia', lat: -7.3, lng: 72.4, country: 'US/UK', type: 'naval' },
  { name: 'Guam', lat: 13.4, lng: 144.8, country: 'US', type: 'joint' },
  // China
  { name: 'South China Sea Bases', lat: 10.0, lng: 115.0, country: 'CN', type: 'naval' },
  { name: 'Hainan Submarine', lat: 18.2, lng: 109.5, country: 'CN', type: 'naval' },
  // Russia
  { name: 'Sevastopol', lat: 44.6, lng: 33.5, country: 'RU', type: 'naval' },
  { name: 'Tartus', lat: 34.9, lng: 35.9, country: 'RU', type: 'naval' },
  // NATO
  { name: 'Rota Naval', lat: 36.6, lng: -6.3, country: 'ES', type: 'naval' },
  { name: 'Incirlik AB', lat: 37.0, lng: 35.4, country: 'TR', type: 'air' },
  // Middle East
  { name: 'Al Udeid', lat: 25.1, lng: 51.3, country: 'QA', type: 'air' },
  { name: 'Al Dhafra', lat: 24.2, lng: 54.5, country: 'AE', type: 'air' },
];

// Risk heat map data points
export interface RiskHeatPoint {
  lat: number;
  lng: number;
  intensity: number; // 0-1
  type: 'conflict' | 'economic' | 'social' | 'composite';
  label?: string;
}

// Pre-defined risk zones for heat map
export const RISK_HEAT_ZONES: RiskHeatPoint[] = [
  // Conflict zones
  { lat: 48.0, lng: 37.0, intensity: 0.95, type: 'conflict', label: 'Ukraine' },
  { lat: 31.5, lng: 34.5, intensity: 0.9, type: 'conflict', label: 'Gaza' },
  { lat: 33.5, lng: 36.3, intensity: 0.85, type: 'conflict', label: 'Syria/Lebanon' },
  { lat: 15.0, lng: 45.0, intensity: 0.75, type: 'conflict', label: 'Yemen' },
  { lat: 35.0, lng: 69.0, intensity: 0.8, type: 'conflict', label: 'Afghanistan' },
  { lat: 9.0, lng: 40.0, intensity: 0.7, type: 'conflict', label: 'Ethiopia/Sudan' },
  { lat: 7.5, lng: 80.5, intensity: 0.6, type: 'conflict', label: 'Sri Lanka/Economic' },
  { lat: 12.0, lng: 43.0, intensity: 0.85, type: 'conflict', label: 'Red Sea' },
  
  // Economic stress zones
  { lat: -23.5, lng: -46.6, intensity: 0.6, type: 'economic', label: 'Brazil' },
  { lat: -30.5, lng: 22.0, intensity: 0.55, type: 'economic', label: 'South Africa' },
  { lat: 39.0, lng: 35.0, intensity: 0.7, type: 'economic', label: 'Turkey' },
  { lat: -33.5, lng: -70.0, intensity: 0.65, type: 'economic', label: 'Chile' },
  { lat: -34.6, lng: -58.4, intensity: 0.75, type: 'economic', label: 'Argentina' },
  { lat: 10.0, lng: -66.0, intensity: 0.85, type: 'economic', label: 'Venezuela' },
  { lat: 33.9, lng: 35.5, intensity: 0.7, type: 'economic', label: 'Lebanon' },
  { lat: 30.0, lng: 31.2, intensity: 0.6, type: 'economic', label: 'Egypt' },
  
  // Social unrest
  { lat: 48.8, lng: 2.3, intensity: 0.5, type: 'social', label: 'France' },
  { lat: 51.5, lng: -0.1, intensity: 0.45, type: 'social', label: 'UK' },
  { lat: 41.9, lng: 12.5, intensity: 0.55, type: 'social', label: 'Italy' },
  { lat: 52.5, lng: 13.4, intensity: 0.4, type: 'social', label: 'Germany' },
  { lat: 19.4, lng: -99.1, intensity: 0.65, type: 'social', label: 'Mexico' },
  { lat: 55.7, lng: 37.6, intensity: 0.5, type: 'social', label: 'Russia' },
  { lat: 35.7, lng: 51.4, intensity: 0.7, type: 'social', label: 'Iran' },
];

// Layer visibility state
export interface LayerVisibility {
  tradeRoutes: boolean;
  economicZones: boolean;
  infrastructure: boolean;
  militaryBases: boolean;
  riskHeatMap: boolean;
  conflicts: boolean;
  markets: boolean;
  riskType: 'all' | 'conflict' | 'economic' | 'social';
}

export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  tradeRoutes: true,
  conflicts: true,
  markets: true,
  economicZones: false,
  infrastructure: false,
  militaryBases: false,
  riskHeatMap: false,
  riskType: 'all',
};

// Color schemes
export const LAYER_COLORS = {
  tradeRoute: 0xffb84d,      // Amber
  economicZone: 0x00d4ff,    // Cyan
  infrastructure: 0x6bff8a,  // Green
  military: 0xff4d6a,        // Red
  heat: {
    low: 0x22c55e,      // Green
    medium: 0xeab308,   // Yellow
    high: 0xf97316,     // Orange
    critical: 0xef4444, // Red
  },
};

// Convert lat/lng to 3D position
export function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Create a curved line between two points on sphere surface
export function createCurvedLine(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  radius: number,
  color: number,
  heightFactor: number = 1.1
): THREE.Line {
  const startPos = latLonToVector3(start.lat, start.lng, radius);
  const endPos = latLonToVector3(end.lat, end.lng, radius);
  
  // Create control point above the surface
  const midPos = startPos.clone().add(endPos).multiplyScalar(0.5).normalize().multiplyScalar(radius * heightFactor);
  
  // Create quadratic bezier curve
  const curve = new THREE.QuadraticBezierCurve3(startPos, midPos, endPos);
  const points = curve.getPoints(50);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  const material = new THREE.LineBasicMaterial({ 
    color, 
    transparent: true, 
    opacity: 0.6,
    linewidth: 1,
  });
  
  return new THREE.Line(geometry, material);
}

// Create heat map shader material
export function createHeatMapMaterial(intensity: number, type: RiskHeatPoint['type']): THREE.ShaderMaterial {
  const colorMap = {
    conflict: new THREE.Color(0xef4444),   // Red
    economic: new THREE.Color(0xeab308),   // Yellow
    social: new THREE.Color(0xf97316),     // Orange
    composite: new THREE.Color(0xa855f7),  // Purple
  };
  
  const color = colorMap[type];
  
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uIntensity: { value: intensity },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uTime;
      varying vec2 vUv;
      
      void main() {
        float dist = distance(vUv, vec2(0.5));
        float pulse = sin(uTime * 2.0) * 0.1 + 0.9;
        float alpha = smoothstep(0.5, 0.0, dist) * uIntensity * pulse * 0.5;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}
