/**
 * Correlation Engine - Cross-Source Intelligence Analysis
 * 
 * Detects patterns across multiple data streams:
 * - FIRMS (thermal signatures)
 * - GDELT (conflict events)
 * - NewsAPI (headlines/sentiment)
 * - OONI (censorship)
 * - ADS-B (military aircraft)
 * - AIS (vessel tracking)
 * 
 * Triggers visual alerts when correlations exceed thresholds
 */

import { globeDataFeed, type GlobePoint, type GlobeLayer } from './globeDataFeed';

// Alert severity levels
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

// Data source types
export type DataSource = 
  | 'firms'      // NASA FIRMS thermal
  | 'gdelt'      // GDELT conflict events
  | 'news'       // NewsAPI headlines
  | 'ooni'       // OONI censorship
  | 'adsb'       // ADS-B aircraft
  | 'ais'        // AIS vessels
  | 'conflict';  // ACLED/other conflict

// Correlation alert structure
export interface CorrelationAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  region: string;
  lat: number;
  lng: number;
  timestamp: number;
  sources: DataSource[];
  confidence: number; // 0-1
  indicators: string[]; // What signals triggered this
  makaveliContext: string; // Context for Makaveli analysis
}

// Region definitions for grouping nearby events
interface Region {
  name: string;
  center: { lat: number; lng: number };
  radiusKm: number; // Detection radius
}

const CORRELATION_REGIONS: Region[] = [
  { name: 'Ukraine', center: { lat: 48.5, lng: 31.0 }, radiusKm: 300 },
  { name: 'Gaza Strip', center: { lat: 31.4, lng: 34.3 }, radiusKm: 100 },
  { name: 'Red Sea', center: { lat: 20.0, lng: 38.0 }, radiusKm: 400 },
  { name: 'Strait of Hormuz', center: { lat: 26.5, lng: 56.3 }, radiusKm: 150 },
  { name: 'Taiwan Strait', center: { lat: 24.0, lng: 120.0 }, radiusKm: 200 },
  { name: 'South China Sea', center: { lat: 15.0, lng: 115.0 }, radiusKm: 500 },
  { name: 'Baltic Region', center: { lat: 57.0, lng: 22.0 }, radiusKm: 300 },
  { name: 'Middle East', center: { lat: 30.0, lng: 45.0 }, radiusKm: 600 },
  { name: 'Korean Peninsula', center: { lat: 38.0, lng: 127.0 }, radiusKm: 200 },
];

// Haversine distance calculation
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Find which correlation region a point belongs to
function findRegion(lat: number, lng: number): Region | null {
  for (const region of CORRELATION_REGIONS) {
    const dist = distanceKm(lat, lng, region.center.lat, region.center.lng);
    if (dist <= region.radiusKm) {
      return region;
    }
  }
  return null;
}

// Detect sources present in a region
function detectSourcesInRegion(
  points: GlobePoint[],
  region: Region,
  timeWindowMs: number = 3600000 // 1 hour default
): Map<DataSource, GlobePoint[]> {
  const now = Date.now();
  const sources = new Map<DataSource, GlobePoint[]>();
  
  for (const point of points) {
    // Check if point is in region
    const dist = distanceKm(point.lat, point.lng, region.center.lat, region.center.lng);
    if (dist > region.radiusKm) continue;
    
    // Check if point is recent
    if (now - point.timestamp > timeWindowMs) continue;
    
    // Detect source from point properties
    const source = detectSource(point);
    if (source) {
      if (!sources.has(source)) {
        sources.set(source, []);
      }
      sources.get(source)!.push(point);
    }
  }
  
  return sources;
}

// Detect source type from point data
function detectSource(point: GlobePoint): DataSource | null {
  if (point.id.startsWith('thermal-')) return 'firms';
  if (point.id.startsWith('censorship-')) return 'ooni';
  if (point.id.startsWith('aircraft-')) return 'adsb';
  if (point.id.startsWith('vessel-')) return 'ais';
  if (point.id.startsWith('gdelt-')) return 'gdelt';
  if (point.id.startsWith('news-')) return 'news';
  if (point.layer === 'conflicts') return 'conflict';
  return null;
}

// Correlation rules
interface CorrelationRule {
  name: string;
  description: string;
  sources: DataSource[];
  minCount: number;
  severity: AlertSeverity;
  confidence: number;
  message: (region: string, details: string) => string;
}

const CORRELATION_RULES: CorrelationRule[] = [
  // Critical: Active conflict + thermal signatures + news
  {
    name: 'Active Strike Detected',
    description: 'Thermal signature + conflict event + negative news within 1 hour',
    sources: ['firms', 'conflict', 'news'],
    minCount: 2,
    severity: 'critical',
    confidence: 0.9,
    message: (region, details) => 
      `Active military strike detected in ${region}. ${details}`,
  },
  
  // Critical: Censorship + military activity
  {
    name: 'Information Warfare',
    description: 'Internet censorship + military aircraft surge',
    sources: ['ooni', 'adsb'],
    minCount: 2,
    severity: 'critical',
    confidence: 0.85,
    message: (region, details) => 
      `Information control measures detected in ${region} alongside military activity. ${details}`,
  },
  
  // High: Thermal + any other source
  {
    name: 'Thermal Anomaly Cluster',
    description: 'Multiple thermal signatures with corroborating intelligence',
    sources: ['firms'],
    minCount: 1,
    severity: 'high',
    confidence: 0.75,
    message: (region, details) => 
      `Thermal anomalies in ${region} require attention. ${details}`,
  },
  
  // High: Vessel rerouting + conflict
  {
    name: 'Maritime Threat Response',
    description: 'Vessels rerouting from conflict zone',
    sources: ['ais', 'conflict'],
    minCount: 2,
    severity: 'high',
    confidence: 0.8,
    message: (region, details) => 
      `Maritime traffic avoiding ${region} due to security concerns. ${details}`,
  },
  
  // High: Censorship escalation
  {
    name: 'Censorship Escalation',
    description: 'Multiple confirmed blocks in short timeframe',
    sources: ['ooni'],
    minCount: 1,
    severity: 'high',
    confidence: 0.7,
    message: (region, details) => 
      `Internet freedom restrictions escalating in ${region}. ${details}`,
  },
  
  // Medium: Military surge pattern
  {
    name: 'Military Logistics Surge',
    description: 'Unusual concentration of military transports',
    sources: ['adsb'],
    minCount: 1,
    severity: 'medium',
    confidence: 0.6,
    message: (region, details) => 
      `Military transport activity above baseline in ${region}. ${details}`,
  },
  
  // Medium: News + GDELT correlation
  {
    name: 'Event Corroboration',
    description: 'News headlines match GDELT conflict data',
    sources: ['news', 'gdelt'],
    minCount: 2,
    severity: 'medium',
    confidence: 0.65,
    message: (region, details) => 
      `Multiple sources confirming instability in ${region}. ${details}`,
  },
];

// Main correlation analysis
export function analyzeCorrelations(points: GlobePoint[]): CorrelationAlert[] {
  const alerts: CorrelationAlert[] = [];
  const now = Date.now();
  
  // Analyze each defined region
  for (const region of CORRELATION_REGIONS) {
    const sourcesInRegion = detectSourcesInRegion(points, region);
    
    // Check each correlation rule
    for (const rule of CORRELATION_RULES) {
      // Count how many required sources are present
      const presentSources = rule.sources.filter(source => 
        sourcesInRegion.has(source) && 
        (sourcesInRegion.get(source)?.length || 0) > 0
      );
      
      // Check if minimum count threshold met
      const totalIndicators = presentSources.reduce((sum, source) => 
        sum + (sourcesInRegion.get(source)?.length || 0), 0
      );
      
      if (presentSources.length >= Math.min(rule.minCount, rule.sources.length) && 
          totalIndicators > 0) {
        
        // Build alert details
        const indicators: string[] = [];
        presentSources.forEach(source => {
          const count = sourcesInRegion.get(source)?.length || 0;
          indicators.push(`${count} ${source.toUpperCase()} signal${count > 1 ? 's' : ''}`);
        });
        
        const alert: CorrelationAlert = {
          id: `corr-${region.name}-${now}-${rule.name.replace(/\s+/g, '-').toLowerCase()}`,
          severity: rule.severity,
          title: rule.name,
          description: rule.message(region.name, indicators.join(', ')),
          region: region.name,
          lat: region.center.lat,
          lng: region.center.lng,
          timestamp: now,
          sources: presentSources,
          confidence: rule.confidence,
          indicators,
          makaveliContext: `${rule.name} in ${region.name}: ${indicators.join(', ')}. ${rule.description}`,
        };
        
        alerts.push(alert);
      }
    }
  }
  
  // Sort by severity (critical first) and deduplicate
  const severityOrder: Record<AlertSeverity, number> = {
    critical: 0, high: 1, medium: 2, low: 3, info: 4
  };
  
  return alerts
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .filter((alert, index, self) => 
      index === self.findIndex(a => 
        a.region === alert.region && a.title === alert.title
      )
    );
}

// Alert manager
class CorrelationAlertManager {
  private alerts: CorrelationAlert[] = [];
  private subscribers: ((alerts: CorrelationAlert[]) => void)[] = [];
  private unsubscribeGlobe: (() => void) | null = null;
  
  constructor() {
    this.startMonitoring();
  }
  
  private startMonitoring() {
    // Subscribe to globe data feed
    this.unsubscribeGlobe = globeDataFeed.subscribe((state) => {
      const newAlerts = analyzeCorrelations(state.points);
      
      // Check if alerts changed
      if (this.haveAlertsChanged(newAlerts)) {
        this.alerts = newAlerts;
        this.notifySubscribers();
        this.injectAlertPoints();
      }
    });
  }
  
  private haveAlertsChanged(newAlerts: CorrelationAlert[]): boolean {
    if (this.alerts.length !== newAlerts.length) return true;
    
    for (let i = 0; i < this.alerts.length; i++) {
      if (this.alerts[i].id !== newAlerts[i]?.id) return true;
    }
    
    return false;
  }
  
  private injectAlertPoints() {
    // Convert alerts to globe points for visualization
    const alertPoints: GlobePoint[] = this.alerts.map(alert => ({
      id: `alert-${alert.id}`,
      lat: alert.lat,
      lng: alert.lng,
      layer: 'conflicts', // Use conflicts layer for alerts
      timestamp: alert.timestamp,
      color: alert.severity === 'critical' ? '#ff0000' :
             alert.severity === 'high' ? '#ff4400' :
             alert.severity === 'medium' ? '#ff8800' : '#ffaa00',
      size: alert.severity === 'critical' ? 0.5 :
            alert.severity === 'high' ? 0.35 : 0.25,
      opacity: 0.9,
      pulse: alert.severity === 'critical' || alert.severity === 'high',
      pulseSpeed: alert.severity === 'critical' ? 1.5 : 1,
      title: alert.title,
      description: alert.description,
      category: 'Intelligence Alert',
      severity: alert.severity,
      makaveliQuery: alert.makaveliContext,
    }));
    
    // Inject into data feed
    globeDataFeed.injectPoints('conflicts', [
      ...globeDataFeed.getState().points.filter(p => !p.id.startsWith('alert-')),
      ...alertPoints
    ]);
  }
  
  subscribe(callback: (alerts: CorrelationAlert[]) => void): () => void {
    this.subscribers.push(callback);
    // Immediately notify with current alerts
    callback(this.alerts);
    
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }
  
  private notifySubscribers() {
    this.subscribers.forEach(cb => cb(this.alerts));
  }
  
  getAlerts(): CorrelationAlert[] {
    return [...this.alerts];
  }
  
  getCriticalAlerts(): CorrelationAlert[] {
    return this.alerts.filter(a => a.severity === 'critical');
  }
  
  destroy() {
    if (this.unsubscribeGlobe) {
      this.unsubscribeGlobe();
    }
    this.subscribers = [];
  }
}

// Singleton instance
export const correlationEngine = new CorrelationAlertManager();

// Hook for React components
export function useCorrelationAlerts() {
  return {
    subscribe: (callback: (alerts: CorrelationAlert[]) => void) => 
      correlationEngine.subscribe(callback),
    getAlerts: () => correlationEngine.getAlerts(),
    getCriticalAlerts: () => correlationEngine.getCriticalAlerts(),
  };
}

export default correlationEngine;
