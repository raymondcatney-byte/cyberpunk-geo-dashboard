/**
 * Globe Data Feed - Unified data management for War Room globe
 * Based on sitdeck.com patterns - centralized feed architecture
 * 
 * NO UI CHANGES - this is purely data layer infrastructure
 */

import * as THREE from 'three';

// Layer types supported by the globe
export type GlobeLayer = 
  | 'conflicts' 
  | 'vessels' 
  | 'flights' 
  | 'sentiment' 
  | 'infrastructure' 
  | 'cyber' 
  | 'ports' 
  | 'markets' 
  | 'earthquakes' 
  | 'simulations'
  | 'tradeRoutes'
  | 'economicZones'
  | 'militaryBases';

// Visual severity levels
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

// Core point data structure - everything on the globe is a point
export interface GlobePoint {
  // Identity
  id: string;
  lat: number;
  lng: number;
  layer: GlobeLayer;
  timestamp: number;
  
  // Visual properties
  color: string;        // hex color
  size: number;         // base size
  opacity: number;      // 0-1
  pulse?: boolean;      // animated pulse
  pulseSpeed?: number;  // pulse frequency
  
  // Tooltip content
  title: string;
  description: string;
  category: string;
  severity: Severity;
  
  // Movement (for vessels, flights)
  heading?: number;     // degrees
  speed?: number;       // knots/kmh
  trail?: { lat: number; lng: number; timestamp: number }[];
  
  // Heatmap
  radius?: number;      // km
  intensity?: number;   // 0-1
  
  // Click actions - what happens when user clicks this point
  makaveliQuery?: string;        // Query for Intel tab
  bruceQuery?: string;           // Query for Protocol/Comms
  polymarketMarketId?: string;   // Direct link to prediction market
  externalUrl?: string;          // External source
}

// Trade route arcs
export interface GlobeArc {
  id: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  color: string;
  width: number;
  animated: boolean;
  volume: number;       // trade volume for sizing
  label?: string;
  throughput?: string;  // e.g., "21M barrels/day"
}

// Regional heatmap overlays
export interface GlobeRegion {
  id: string;
  layer: GlobeLayer;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  color: string;
  opacity: number;
  intensity: number;    // 0-1
  sentiment?: 'fear' | 'greed' | 'neutral' | 'uncertainty';
  metrics?: Record<string, number>;
  label?: string;
}

// Data transformation function type
export type DataTransformer<T> = (raw: T[]) => GlobePoint[];

// Feed state
interface FeedState {
  points: GlobePoint[];
  arcs: GlobeArc[];
  regions: GlobeRegion[];
  activeLayers: Set<GlobeLayer>;
  lastUpdate: Record<GlobeLayer, number>;
}

// Subscriber callback type
type FeedCallback = (state: FeedState) => void;

/**
 * Globe Data Feed - Central data manager for War Room globe
 * 
 * Usage:
 *   import { globeDataFeed } from '../services/globeDataFeed';
 *   
 *   // Subscribe to updates
 *   globeDataFeed.subscribe((state) => {
 *     updateThreeJSPoints(state.points);
 *     updateThreeJSArcs(state.arcs);
 *     updateThreeJSRegions(state.regions);
 *   });
 *   
 *   // Inject data from any source
 *   globeDataFeed.injectPoints('conflicts', acledEvents);
 *   globeDataFeed.injectPoints('vessels', aisData);
 */
export class GlobeDataFeed {
  private state: FeedState = {
    points: [],
    arcs: [],
    regions: [],
    activeLayers: new Set(['tradeRoutes', 'flights', 'conflicts', 'cyber', 'vessels']), // Default active
    lastUpdate: {} as Record<GlobeLayer, number>,
  };
  
  private subscribers: FeedCallback[] = [];
  private transformers: Map<GlobeLayer, DataTransformer<unknown>> = new Map();
  private fetchers: Map<GlobeLayer, () => Promise<unknown[]>> = new Map();
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  
  // Color palette by layer
  private layerColors: Record<GlobeLayer, string> = {
    conflicts: '#ef4444',      // Red
    vessels: '#3b82f6',        // Blue
    flights: '#06b6d4',        // Cyan
    sentiment: '#8b5cf6',      // Purple
    infrastructure: '#22c55e', // Green
    cyber: '#f59e0b',          // Amber
    ports: '#14b8a6',          // Teal
    markets: '#eab308',        // Yellow (news/market events)
    earthquakes: '#f97316',    // Orange
    simulations: '#ec4899',    // Pink
    tradeRoutes: '#f59e0b',    // Amber
    economicZones: '#06b6d4',  // Cyan
    militaryBases: '#dc2626',  // Dark red
  };
  
  constructor() {
    // Register default transformers
    this.registerDefaultTransformers();
  }
  
  /**
   * Subscribe to feed updates
   */
  subscribe(callback: FeedCallback): () => void {
    this.subscribers.push(callback);
    // Immediately notify with current state
    callback(this.state);
    
    // Return unsubscribe function
    return () => {
      const idx = this.subscribers.indexOf(callback);
      if (idx > -1) this.subscribers.splice(idx, 1);
    };
  }
  
  /**
   * Notify all subscribers of state change
   */
  private notify(): void {
    this.subscribers.forEach(cb => cb(this.state));
  }
  
  /**
   * Set data fetcher for a layer (for auto-refresh)
   */
  setDataFetcher(layer: GlobeLayer, fetcher: () => Promise<unknown[]>): void {
    this.fetchers.set(layer, fetcher);
  }
  
  /**
   * Set custom transformer for a layer
   */
  setTransformer<T>(layer: GlobeLayer, transformer: DataTransformer<T>): void {
    this.transformers.set(layer, transformer as DataTransformer<unknown>);
  }
  
  /**
   * Inject points into a layer
   */
  injectPoints(layer: GlobeLayer, rawData: unknown[]): void {
    const transformer = this.transformers.get(layer);
    if (!transformer) {
      console.warn(`[GlobeDataFeed] No transformer for layer: ${layer}`);
      return;
    }
    
    const points = transformer(rawData);
    
    // Remove old points from this layer
    this.state.points = this.state.points.filter(p => p.layer !== layer);
    
    // Add new points
    this.state.points.push(...points);
    
    // Update timestamp
    this.state.lastUpdate[layer] = Date.now();
    
    this.notify();
  }
  
  /**
   * Inject trade route arcs
   */
  injectArcs(arcs: GlobeArc[]): void {
    this.state.arcs = arcs;
    this.notify();
  }
  
  /**
   * Inject regional heatmaps
   */
  injectRegions(layer: GlobeLayer, rawData: unknown[]): void {
    // Transform to regions (simplified - can be extended)
    const regions: GlobeRegion[] = rawData.map((d: any, idx) => ({
      id: `${layer}-${idx}`,
      layer,
      bounds: d.bounds || { north: d.lat + 5, south: d.lat - 5, east: d.lng + 5, west: d.lng - 5 },
      color: this.layerColors[layer],
      opacity: d.intensity || 0.5,
      intensity: d.intensity || 0.5,
      sentiment: d.sentiment,
      label: d.label || `${layer} region`,
    }));
    
    // Remove old regions from this layer
    this.state.regions = this.state.regions.filter(r => r.layer !== layer);
    
    // Add new regions
    this.state.regions.push(...regions);
    
    this.notify();
  }
  
  /**
   * Set which layers are active
   */
  setActiveLayers(layers: GlobeLayer[]): void {
    this.state.activeLayers = new Set(layers);
    this.notify();
  }
  
  /**
   * Toggle a layer on/off
   */
  toggleLayer(layer: GlobeLayer): void {
    if (this.state.activeLayers.has(layer)) {
      this.state.activeLayers.delete(layer);
    } else {
      this.state.activeLayers.add(layer);
    }
    this.notify();
  }
  
  /**
   * Check if layer is active
   */
  isLayerActive(layer: GlobeLayer): boolean {
    return this.state.activeLayers.has(layer);
  }
  
  /**
   * Get points near a location
   */
  getPointsNear(lat: number, lng: number, radiusKm: number): GlobePoint[] {
    const R = 6371; // Earth radius in km
    
    return this.state.points.filter(p => {
      const dLat = (p.lat - lat) * Math.PI / 180;
      const dLng = (p.lng - lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat * Math.PI / 180) * Math.cos(p.lat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      return distance <= radiusKm;
    });
  }
  
  /**
   * Manual refresh of all layers with fetchers
   */
  async refresh(): Promise<void> {
    for (const [layer, fetcher] of this.fetchers.entries()) {
      if (!this.state.activeLayers.has(layer)) continue;
      
      try {
        const data = await fetcher();
        this.injectPoints(layer, data);
      } catch (err) {
        console.error(`[GlobeDataFeed] Failed to refresh ${layer}:`, err);
      }
    }
  }
  
  /**
   * Start auto-refresh interval
   */
  startAutoRefresh(intervalMs: number = 30000): void {
    this.stopAutoRefresh();
    this.refreshInterval = setInterval(() => this.refresh(), intervalMs);
  }
  
  /**
   * Stop auto-refresh
   */
  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
  
  /**
   * Get current state (for initial render)
   */
  getState(): FeedState {
    return { ...this.state };
  }
  
  /**
   * Register default transformers
   */
  private registerDefaultTransformers(): void {
    // Conflicts transformer (ACLED format)
    this.transformers.set('conflicts', (raw: any[]): GlobePoint[] => {
      return raw.map((d, idx) => ({
        id: `conflict-${idx}`,
        lat: d.latitude || d.lat,
        lng: d.longitude || d.lng,
        layer: 'conflicts',
        timestamp: Date.parse(d.event_date) || Date.now(),
        color: this.layerColors.conflicts,
        size: Math.max(0.1, Math.min(0.5, (d.fatalities || 1) / 50)),
        opacity: 0.8,
        pulse: (d.fatalities || 0) > 20,
        title: d.event_type || 'Conflict Event',
        description: d.notes || `${d.fatalities || 0} fatalities`,
        category: d.sub_event_type || 'Unspecified',
        severity: d.fatalities > 50 ? 'critical' : d.fatalities > 20 ? 'high' : 'medium',
        makaveliQuery: `Analyze conflict in ${d.location || 'this region'}: ${d.event_type}`,
      }));
    });
    
    // Vessels transformer (AIS format)
    this.transformers.set('vessels', (raw: any[]): GlobePoint[] => {
      return raw.map((d, idx) => ({
        id: d.mmsi || `vessel-${idx}`,
        lat: d.latitude || d.lat,
        lng: d.longitude || d.lng,
        layer: 'vessels',
        timestamp: Date.now(),
        color: (d.speed || 0) > 20 ? '#22c55e' : '#3b82f6',
        size: 0.15,
        opacity: 0.9,
        heading: d.heading || d.course || 0,
        speed: d.speed || 0,
        title: d.ship_name || d.name || 'Unknown Vessel',
        description: `${d.vessel_type || 'Unknown type'} | ${d.speed?.toFixed(1) || 0} knots`,
        category: d.vessel_type || 'Unspecified',
        severity: 'info',
        makaveliQuery: `Analyze maritime traffic: ${d.vessel_type} in ${d.location || 'this region'}`,
      }));
    });
    
    // Flights transformer (ADS-B format)
    this.transformers.set('flights', (raw: any[]): GlobePoint[] => {
      return raw.map((d, idx) => ({
        id: d.icao24 || d.hex || `flight-${idx}`,
        lat: d.latitude || d.lat,
        lng: d.longitude || d.lng,
        layer: 'flights',
        timestamp: Date.now(),
        color: (d.altitude || 0) > 30000 ? '#06b6d4' : '#f59e0b',
        size: 0.1,
        opacity: 0.8,
        heading: d.true_track || d.heading || 0,
        speed: d.velocity || d.groundspeed || 0,
        title: d.callsign?.trim() || 'Unknown Flight',
        description: `Alt: ${Math.round((d.altitude || 0) / 1000)}k ft | ${d.origin_country || ''}`,
        category: d.on_ground ? 'Ground' : 'Airborne',
        severity: d.squawk === '7700' ? 'critical' : d.squawk === '7600' ? 'high' : 'info',
        makaveliQuery: `Analyze flight pattern: ${d.callsign?.trim() || 'Unknown'}`,
      }));
    });
    
    // Infrastructure transformer (DNS/Outage data)
    this.transformers.set('infrastructure', (raw: any[]): GlobePoint[] => {
      return raw.map((d, idx) => ({
        id: `infra-${idx}`,
        lat: d.lat,
        lng: d.lng,
        layer: 'infrastructure',
        timestamp: Date.now(),
        color: d.status === 'up' ? '#22c55e' : '#ef4444',
        size: 0.12,
        opacity: 0.7,
        pulse: d.status !== 'up',
        title: d.name || 'Infrastructure Node',
        description: `${d.type || 'Unknown'} | ${d.status || 'Unknown status'}`,
        category: d.type || 'Unspecified',
        severity: d.status === 'down' ? 'high' : 'info',
        makaveliQuery: `Analyze infrastructure impact: ${d.type} outage in ${d.location || 'this region'}`,
      }));
    });
    
    // Earthquakes transformer (USGS format)
    this.transformers.set('earthquakes', (raw: any[]): GlobePoint[] => {
      return raw.map((d, idx) => ({
        id: d.id || `quake-${idx}`,
        lat: d.geometry?.coordinates?.[1] || d.latitude || d.lat,
        lng: d.geometry?.coordinates?.[0] || d.longitude || d.lng,
        layer: 'earthquakes',
        timestamp: Date.parse(d.properties?.time) || Date.now(),
        color: (d.properties?.mag || d.magnitude || 5) > 6 ? '#ef4444' : '#f97316',
        size: Math.max(0.1, Math.min(0.6, ((d.properties?.mag || d.magnitude || 5) - 3) / 5)),
        opacity: 0.7,
        pulse: (d.properties?.mag || d.magnitude || 5) > 6,
        title: `M${(d.properties?.mag || d.magnitude || 0).toFixed(1)} Earthquake`,
        description: d.properties?.place || d.location || 'Unknown location',
        category: 'Natural Disaster',
        severity: (d.properties?.mag || d.magnitude || 5) > 7 ? 'critical' : 
                 (d.properties?.mag || d.magnitude || 5) > 5 ? 'high' : 'medium',
        makaveliQuery: `Assess earthquake impact: M${(d.properties?.mag || d.magnitude || 0).toFixed(1)}`,
      }));
    });
    
    // Economic zones transformer
    this.transformers.set('economicZones', (raw: any[]): GlobePoint[] => {
      return raw.map((d, idx) => ({
        id: `econ-${idx}`,
        lat: d.lat,
        lng: d.lng,
        layer: 'economicZones',
        timestamp: Date.now(),
        color: this.layerColors.economicZones,
        size: 0.2,
        opacity: 0.6,
        title: d.name || 'Economic Zone',
        description: `${d.type || 'Zone'} | ${d.importance || 'Unknown importance'}`,
        category: d.type || 'Unspecified',
        severity: d.importance === 'critical' ? 'high' : 'medium',
        bruceQuery: `Analyze economic significance of ${d.name}`,
      }));
    });
    
    // Military bases transformer
    this.transformers.set('militaryBases', (raw: any[]): GlobePoint[] => {
      return raw.map((d, idx) => ({
        id: `mil-${idx}`,
        lat: d.lat,
        lng: d.lng,
        layer: 'militaryBases',
        timestamp: Date.now(),
        color: this.layerColors.militaryBases,
        size: 0.15,
        opacity: 0.7,
        title: d.name || 'Military Installation',
        description: `${d.country} | ${d.type || 'Unknown type'}`,
        category: d.type || 'Unspecified',
        severity: 'info',
        makaveliQuery: `Analyze strategic importance of ${d.name}`,
      }));
    });
    
    // Markets/News transformer (geotagged news events)
    this.transformers.set('markets', (raw: any[]): GlobePoint[] => {
      return raw.map((d, idx) => ({
        id: d.id || `news-${idx}`,
        lat: d.lat,
        lng: d.lng,
        layer: 'markets',
        timestamp: d.timestamp || Date.now(),
        color: d.color || this.layerColors.markets,
        size: d.size || 0.15,
        opacity: d.opacity || 0.8,
        pulse: d.pulse || false,
        title: d.title || 'Market Event',
        description: d.description || 'News intelligence event',
        category: d.category || 'Unspecified',
        severity: d.severity || 'medium',
        makaveliQuery: d.makaveliQuery || `Analyze: ${d.title}`,
        externalUrl: d.externalUrl,
      }));
    });
  }
}

// Singleton instance
export const globeDataFeed = new GlobeDataFeed();

// Default export for convenience
export default globeDataFeed;
