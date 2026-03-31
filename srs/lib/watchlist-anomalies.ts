/**
 * Watchlist Anomaly Detection
 * Zero-cost client-side anomaly detection for the 22 watchlist markets
 * Uses localStorage for snapshots, no database required
 */

import { POLYMARKET_WATCHLIST, ARBITRAGE_PAIRS } from '../config/polymarketWatchlist';

export interface MarketSnapshot {
  slug: string;
  yesPrice: number;
  volume: number;
  liquidity: number;
  spread: number;
  timestamp: number;
}

export interface WatchlistSnapshot {
  timestamp: number;
  markets: MarketSnapshot[];
}

export interface AnomalyDetection {
  type: 'price_spike' | 'price_drop' | 'volume_surge' | 'liquidity_drop' | 'spread_wide' | 'arbitrage_divergence';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export interface AnomalyResult {
  slug: string;
  displayName: string;
  category: string;
  current: MarketSnapshot;
  previous: MarketSnapshot | null;
  anomalies: AnomalyDetection[];
  maxSeverity: 'low' | 'medium' | 'high' | 'critical' | null;
}

export interface ArbitrageAnomaly {
  pair: string;
  marketA: string;
  marketB: string;
  priceA: number;
  priceB: number;
  divergence: number;
  threshold: number;
  severity: 'medium' | 'high' | 'critical';
  message: string;
}

const STORAGE_KEY = 'pm_watchlist_snapshots';
const MAX_SNAPSHOTS = 48; // 24 hours at 30-min intervals

// Thresholds for anomaly detection
const THRESHOLDS = {
  PRICE_SPIKE: 0.05,      // 5% increase
  PRICE_DROP: -0.05,      // 5% decrease
  VOLUME_SURGE: 3.0,      // 3x average volume
  LIQUIDITY_DROP: -0.20,  // 20% liquidity decrease
  SPREAD_WIDE: 0.05,      // 5% spread
};

/**
 * Load all snapshots from localStorage
 */
export function loadSnapshots(): WatchlistSnapshot[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const snapshots = JSON.parse(stored) as WatchlistSnapshot[];
    
    // Filter out snapshots older than 24 hours
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    return snapshots.filter(s => s.timestamp > cutoff);
  } catch (e) {
    console.warn('[watchlist-anomalies] Failed to load snapshots:', e);
    return [];
  }
}

/**
 * Save snapshot to localStorage
 */
export function saveSnapshot(snapshot: WatchlistSnapshot): void {
  if (typeof window === 'undefined') return;
  
  try {
    const snapshots = loadSnapshots();
    snapshots.push(snapshot);
    
    // Keep only the last MAX_SNAPSHOTS
    while (snapshots.length > MAX_SNAPSHOTS) {
      snapshots.shift();
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
  } catch (e) {
    console.warn('[watchlist-anomalies] Failed to save snapshot:', e);
  }
}

/**
 * Get the most recent snapshot
 */
export function getLastSnapshot(): WatchlistSnapshot | null {
  const snapshots = loadSnapshots();
  return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
}

/**
 * Calculate average volume over all stored snapshots for a market
 */
export function getAverageVolume(slug: string): number {
  const snapshots = loadSnapshots();
  const volumes: number[] = [];
  
  for (const snapshot of snapshots) {
    const market = snapshot.markets.find(m => m.slug === slug);
    if (market && market.volume > 0) {
      volumes.push(market.volume);
    }
  }
  
  if (volumes.length === 0) return 0;
  return volumes.reduce((a, b) => a + b, 0) / volumes.length;
}

/**
 * Detect anomalies for a single market
 */
export function detectMarketAnomalies(
  current: MarketSnapshot,
  previous: MarketSnapshot | null
): AnomalyDetection[] {
  const anomalies: AnomalyDetection[] = [];
  
  if (!previous) return anomalies;
  
  // Price change calculation
  const priceChange = previous.yesPrice > 0
    ? (current.yesPrice - previous.yesPrice) / previous.yesPrice
    : 0;
  
  // Price spike
  if (priceChange >= THRESHOLDS.PRICE_SPIKE) {
    anomalies.push({
      type: 'price_spike',
      severity: priceChange > 0.10 ? 'critical' : priceChange > 0.07 ? 'high' : 'medium',
      message: `Price up ${(priceChange * 100).toFixed(1)}%`,
      value: priceChange,
      threshold: THRESHOLDS.PRICE_SPIKE,
      timestamp: Date.now(),
    });
  }
  
  // Price drop
  if (priceChange <= THRESHOLDS.PRICE_DROP) {
    anomalies.push({
      type: 'price_drop',
      severity: priceChange < -0.10 ? 'critical' : priceChange < -0.07 ? 'high' : 'medium',
      message: `Price down ${(Math.abs(priceChange) * 100).toFixed(1)}%`,
      value: priceChange,
      threshold: THRESHOLDS.PRICE_DROP,
      timestamp: Date.now(),
    });
  }
  
  // Volume surge
  const avgVolume = getAverageVolume(current.slug);
  if (avgVolume > 0 && current.volume > 0) {
    const volumeRatio = current.volume / avgVolume;
    if (volumeRatio >= THRESHOLDS.VOLUME_SURGE) {
      anomalies.push({
        type: 'volume_surge',
        severity: volumeRatio > 5 ? 'critical' : volumeRatio > 4 ? 'high' : 'medium',
        message: `Volume ${volumeRatio.toFixed(1)}x average`,
        value: volumeRatio,
        threshold: THRESHOLDS.VOLUME_SURGE,
        timestamp: Date.now(),
      });
    }
  }
  
  // Liquidity drop
  if (previous.liquidity > 0 && current.liquidity > 0) {
    const liquidityChange = (current.liquidity - previous.liquidity) / previous.liquidity;
    if (liquidityChange <= THRESHOLDS.LIQUIDITY_DROP) {
      anomalies.push({
        type: 'liquidity_drop',
        severity: liquidityChange < -0.40 ? 'critical' : liquidityChange < -0.30 ? 'high' : 'medium',
        message: `Liquidity down ${(Math.abs(liquidityChange) * 100).toFixed(0)}%`,
        value: liquidityChange,
        threshold: THRESHOLDS.LIQUIDITY_DROP,
        timestamp: Date.now(),
      });
    }
  }
  
  // Wide spread
  if (current.spread >= THRESHOLDS.SPREAD_WIDE) {
    anomalies.push({
      type: 'spread_wide',
      severity: current.spread > 0.10 ? 'high' : 'low',
      message: `Wide spread ${(current.spread * 100).toFixed(1)}%`,
      value: current.spread,
      threshold: THRESHOLDS.SPREAD_WIDE,
      timestamp: Date.now(),
    });
  }
  
  return anomalies;
}

/**
 * Detect arbitrage divergence between paired markets
 */
export function detectArbitrageAnomalies(
  markets: Map<string, MarketSnapshot>
): ArbitrageAnomaly[] {
  const anomalies: ArbitrageAnomaly[] = [];
  
  for (const pair of ARBITRAGE_PAIRS) {
    const marketA = markets.get(pair.marketA);
    const marketB = markets.get(pair.marketB);
    
    if (!marketA || !marketB) continue;
    
    // Calculate price divergence (for related markets)
    const priceA = marketA.yesPrice;
    const priceB = marketB.yesPrice;
    
    if (priceA === 0 || priceB === 0) continue;
    
    const divergence = Math.abs(priceA - priceB);
    const threshold = pair.divergenceThreshold / 100; // Convert from percentage
    
    if (divergence >= threshold) {
      const severity = divergence > threshold * 1.5 ? 'critical' : divergence > threshold * 1.2 ? 'high' : 'medium';
      
      anomalies.push({
        pair: `${pair.marketA} vs ${pair.marketB}`,
        marketA: pair.marketA,
        marketB: pair.marketB,
        priceA,
        priceB,
        divergence,
        threshold,
        severity,
        message: `${pair.correlation} divergence: ${(divergence * 100).toFixed(1)}%`,
      });
    }
  }
  
  return anomalies;
}

/**
 * Scan all watchlist markets for anomalies
 */
export function scanForAnomalies(currentMarkets: MarketSnapshot[]): {
  marketAnomalies: AnomalyResult[];
  arbitrageAnomalies: ArbitrageAnomaly[];
  totalAnomalies: number;
  criticalCount: number;
} {
  const lastSnapshot = getLastSnapshot();
  const previousMarkets = lastSnapshot?.markets || [];
  const previousMap = new Map(previousMarkets.map(m => [m.slug, m]));
  const currentMap = new Map(currentMarkets.map(m => [m.slug, m]));
  
  const marketAnomalies: AnomalyResult[] = [];
  let totalAnomalies = 0;
  let criticalCount = 0;
  
  for (const watchlistItem of POLYMARKET_WATCHLIST) {
    const current = currentMap.get(watchlistItem.slug);
    if (!current) continue;
    
    const previous = previousMap.get(watchlistItem.slug) || null;
    const anomalies = detectMarketAnomalies(current, previous);
    
    if (anomalies.length > 0) {
      const severities = anomalies.map(a => a.severity);
      const maxSeverity = severities.includes('critical') ? 'critical' :
                         severities.includes('high') ? 'high' :
                         severities.includes('medium') ? 'medium' : 'low';
      
      if (maxSeverity === 'critical') criticalCount++;
      totalAnomalies += anomalies.length;
      
      marketAnomalies.push({
        slug: watchlistItem.slug,
        displayName: watchlistItem.displayName,
        category: watchlistItem.category,
        current,
        previous,
        anomalies,
        maxSeverity,
      });
    }
  }
  
  // Sort by severity (critical first)
  marketAnomalies.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, null: 4 };
    return severityOrder[a.maxSeverity || 'null'] - severityOrder[b.maxSeverity || 'null'];
  });
  
  const arbitrageAnomalies = detectArbitrageAnomalies(currentMap);
  
  return {
    marketAnomalies,
    arbitrageAnomalies,
    totalAnomalies,
    criticalCount,
  };
}

/**
 * Save current data as new snapshot
 */
export function recordSnapshot(markets: MarketSnapshot[]): void {
  const snapshot: WatchlistSnapshot = {
    timestamp: Date.now(),
    markets,
  };
  saveSnapshot(snapshot);
}

/**
 * Clear all snapshots (for debugging)
 */
export function clearSnapshots(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
