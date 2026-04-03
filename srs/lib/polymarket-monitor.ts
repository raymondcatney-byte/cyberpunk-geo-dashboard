/**
 * Polymarket Monitor - TypeScript Port
 * Fetches market data, tracks price history, generates alerts
 * Client-side only - no serverless functions needed
 */

import { MonitoredMarket, PRICE_HISTORY_KEY, ALERTS_KEY } from '../config/polymarketMonitor';

// Types
export interface MarketReading {
  timestamp: string;
  price: number;
  volume: number;
}

export interface PriceChanges {
  '1h': number | null;
  '24h': number | null;
  '7d': number | null;
  trend: 'surging' | 'rising' | 'stable' | 'falling' | 'crashing';
}

export type AlertSeverity = 'P0' | 'P1' | 'P2' | 'P3';
export type AlertType = 'PRICE_MOVEMENT' | 'TREND_ALERT' | 'VOLUME_SPIKE';

export interface Alert {
  id: string;
  timestamp: string;
  marketId: string;
  marketName: string;
  category: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  details: {
    oldPrice?: number;
    newPrice?: number;
    priceChange?: number;
    oldVolume?: number;
    newVolume?: number;
    volumeMultiplier?: number;
  };
}

export interface MarketData {
  id: string;
  category: string;
  name: string;
  currentPrice: number;
  priceYes: string;
  priceNo: string;
  changes: PriceChanges;
  volume: number;
  liquidity: number;
  lastUpdated: string;
  url: string;
  alert?: Alert;
}

export interface NervEvent {
  id: string;
  domain: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  timestamp: string;
  source: string;
  sourceType: string;
  url: string;
  confidence: number;
  payload: {
    marketId: string;
    priceYes: string;
    priceNo: string;
    trend: string;
    change1h: number | null;
    change24h: number | null;
    volume: number;
    liquidity: number;
    alert?: Alert;
  };
  thesis: string;
  whyNow: string;
  nextMoves: string[];
  watchIndicators: string[];
}

// Price/Vol history storage
interface PriceHistory {
  [marketId: string]: MarketReading[];
}

// Volume spike thresholds
const VOLUME_SPIKE_CONFIG = {
  minVolumeChange: 10000,      // $10k minimum
  spikeThreshold: 5,           // 5x average
  severeThreshold: 10,         // 10x = P1
  criticalThreshold: 20        // 20x = P0
};

/**
 * Detect volume spike from history
 * Triggers when: volume > 5x average OR > 10x previous reading
 */
export function detectVolumeSpike(
  history: MarketReading[],
  currentVolume: number
): {
  isSpike: boolean;
  multiplier: number;
  severity: AlertSeverity;
  oldVolume: number;
} | null {
  if (history.length < 2 || currentVolume <= 0) return null;

  const previous = history[history.length - 1];
  const oldVolume = previous.volume || 0;
  
  // Need volume history to detect spike
  if (oldVolume <= 0) return null;

  // Calculate average volume from last 20 readings (or fewer if not available)
  const volumeHistory = history.slice(-20).map(h => h.volume).filter(v => v > 0);
  if (volumeHistory.length < 2) return null;
  
  const avgVolume = volumeHistory.reduce((a, b) => a + b, 0) / volumeHistory.length;
  
  // Calculate multipliers
  const multiplierFromPrev = currentVolume / oldVolume;
  const multiplierFromAvg = currentVolume / avgVolume;
  
  // Use the higher multiplier
  const multiplier = Math.max(multiplierFromPrev, multiplierFromAvg);
  
  // Check minimum change threshold
  const volumeChange = currentVolume - oldVolume;
  if (volumeChange < VOLUME_SPIKE_CONFIG.minVolumeChange) return null;
  
  // Check spike threshold
  if (multiplier < VOLUME_SPIKE_CONFIG.spikeThreshold) return null;
  
  // Determine severity
  let severity: AlertSeverity = 'P2';  // Base spike = P2
  if (multiplier >= VOLUME_SPIKE_CONFIG.criticalThreshold) {
    severity = 'P0';
  } else if (multiplier >= VOLUME_SPIKE_CONFIG.severeThreshold) {
    severity = 'P1';
  }
  
  return {
    isSpike: true,
    multiplier,
    severity,
    oldVolume
  };
}

/**
 * Load price history from localStorage
 */
export function loadPriceHistory(): PriceHistory {
  try {
    const stored = localStorage.getItem(PRICE_HISTORY_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Save price history to localStorage
 */
export function savePriceHistory(history: PriceHistory): void {
  try {
    localStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save price history:', e);
  }
}

/**
 * Load alerts from localStorage
 */
export function loadAlerts(): Alert[] {
  try {
    const stored = localStorage.getItem(ALERTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save alerts to localStorage
 */
export function saveAlerts(alerts: Alert[]): void {
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  } catch (e) {
    console.error('Failed to save alerts:', e);
  }
}

/**
 * Fetch market data from Polymarket Gamma API via our serverless proxy
 * Uses /api/polymarket?action=market to avoid CORS issues
 */
export async function fetchMarketData(marketId: string): Promise<{
  currentPrice: number;
  volume: number;
  liquidity: number;
  endDate?: string;
} | null> {
  try {
    // Use our existing serverless function as proxy to avoid CORS
    const response = await fetch(
      `/api/polymarket?action=market&slug=${encodeURIComponent(marketId)}`,
      {
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch ${marketId}: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.ok || !data.market) {
      console.warn(`No data found for ${marketId}`);
      return null;
    }

    const market = data.market;
    
    // Extract yes price
    const currentPrice = market.yesPrice || 0.5;

    return {
      currentPrice,
      volume: market.volume || 0,
      liquidity: market.liquidity || 0,
      endDate: market.endDate
    };
  } catch (error) {
    console.error(`Error fetching ${marketId}:`, error);
    return null;
  }
}

/**
 * Calculate price changes from history
 */
export function calculateChanges(
  history: MarketReading[],
  currentPrice: number,
  currentVolume: number,
  marketId: string
): { changes: PriceChanges; updatedHistory: MarketReading[] } {
  const now = new Date();
  const nowISO = now.toISOString();

  // Add current reading with volume
  const updatedHistory = [...history, { timestamp: nowISO, price: currentPrice, volume: currentVolume }];
  
  // Keep only last 100 readings
  const trimmedHistory = updatedHistory.slice(-100);
  
  const changes: PriceChanges = {
    '1h': null,
    '24h': null,
    '7d': null,
    trend: 'stable'
  };

  if (trimmedHistory.length >= 2) {
    // 1 hour change
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const past1h = trimmedHistory.filter(h => new Date(h.timestamp) > oneHourAgo);
    if (past1h.length > 0) {
      changes['1h'] = currentPrice - past1h[0].price;
    }

    // 24 hour change
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const past24h = trimmedHistory.filter(h => new Date(h.timestamp) > oneDayAgo);
    if (past24h.length > 0) {
      changes['24h'] = currentPrice - past24h[0].price;
    }

    // 7 day change
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const past7d = trimmedHistory.filter(h => new Date(h.timestamp) > sevenDaysAgo);
    if (past7d.length > 0) {
      changes['7d'] = currentPrice - past7d[0].price;
    }

    // Determine trend
    if (changes['1h'] !== null) {
      if (changes['1h'] > 0.02) changes.trend = 'surging';
      else if (changes['1h'] > 0.01) changes.trend = 'rising';
      else if (changes['1h'] < -0.02) changes.trend = 'crashing';
      else if (changes['1h'] < -0.01) changes.trend = 'falling';
    }
  }

  return { changes, updatedHistory: trimmedHistory };
}

/**
 * Check if price movement triggers an alert
 */
export function checkAlert(
  market: MonitoredMarket,
  currentPrice: number,
  currentVolume: number,
  changes: PriceChanges,
  volumeSpike: ReturnType<typeof detectVolumeSpike>
): Alert | undefined {
  const threshold = market.threshold;

  // Volume spike alert takes priority
  if (volumeSpike?.isSpike) {
    return {
      id: `vol-${market.id}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      marketId: market.id,
      marketName: market.name,
      category: market.category,
      type: 'VOLUME_SPIKE',
      severity: volumeSpike.severity,
      message: `Volume spike ${volumeSpike.multiplier.toFixed(1)}x on ${market.name}`,
      details: {
        oldVolume: volumeSpike.oldVolume,
        newVolume: currentVolume,
        volumeMultiplier: volumeSpike.multiplier
      }
    };
  }

  // Check for significant price movement
  if (changes['1h'] !== null && Math.abs(changes['1h']) >= threshold) {
    const isSevere = Math.abs(changes['1h']) >= threshold * 2;
    return {
      id: `price-${market.id}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      marketId: market.id,
      marketName: market.name,
      category: market.category,
      type: 'PRICE_MOVEMENT',
      severity: isSevere ? 'P1' : 'P2',
      message: `${market.name} ${changes['1h']! > 0 ? '↑' : '↓'} ${(Math.abs(changes['1h']!) * 100).toFixed(1)}% in 1h`,
      details: {
        oldPrice: currentPrice - changes['1h']!,
        newPrice: currentPrice,
        priceChange: changes['1h']!
      }
    };
  }

  // Check for trend alert
  if (changes.trend === 'surging' || changes.trend === 'crashing') {
    return {
      id: `trend-${market.id}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      marketId: market.id,
      marketName: market.name,
      category: market.category,
      type: 'TREND_ALERT',
      severity: changes.trend === 'crashing' ? 'P0' : 'P1',
      message: `${market.name} is ${changes.trend.toUpperCase()}: ${(currentPrice * 100).toFixed(1)}¢`,
      details: {
        newPrice: currentPrice
      }
    };
  }

  return undefined;
}

/**
 * Map P-level severity to NERV severity
 */
function mapSeverity(pSeverity: AlertSeverity): NervEvent['severity'] {
  const map: Record<AlertSeverity, NervEvent['severity']> = {
    'P0': 'critical',
    'P1': 'high',
    'P2': 'medium',
    'P3': 'low'
  };
  return map[pSeverity];
}

/**
 * Format market data as NERV event
 */
export function formatForNerv(marketData: MarketData): NervEvent {
  const change1h = marketData.changes['1h'];
  const direction = change1h && change1h > 0 ? 'rising' : 'falling';
  
  let thesis: string;
  if (change1h) {
    thesis = `${marketData.name} odds ${direction} to ${marketData.priceYes}`;
  } else {
    thesis = `${marketData.name} stable at ${marketData.priceYes}`;
  }

  // Map severity
  let severity: NervEvent['severity'] = 'low';
  if (marketData.alert) {
    severity = mapSeverity(marketData.alert.severity);
  } else {
    const trendSeverity: Record<string, NervEvent['severity']> = {
      surging: 'high',
      rising: 'medium',
      falling: 'medium',
      crashing: 'high',
      stable: 'low'
    };
    severity = trendSeverity[marketData.changes.trend] || 'low';
  }

  // Build thesis based on alert type
  let whyNow = `Market odds: ${marketData.priceYes} Yes / ${marketData.priceNo} No`;
  const nextMoves: string[] = [];
  
  if (marketData.alert?.type === 'VOLUME_SPIKE') {
    const mult = marketData.alert.details.volumeMultiplier;
    thesis = `${marketData.name} - Volume spike ${mult?.toFixed(1)}x detected`;
    whyNow = `Unusual trading activity: $${(marketData.volume / 1e6).toFixed(2)}M volume`;
    nextMoves.push(
      'Check social media for breaking news',
      'Review order book for whale activity',
      'Monitor for sustained momentum'
    );
  } else {
    nextMoves.push(
      `Monitor ${marketData.name} for continued ${(change1h || 0) > 0 ? 'strength' : 'weakness'}`,
      marketData.liquidity < 100000 
        ? 'Check Polymarket for order book depth' 
        : 'High liquidity - reliable signal'
    );
  }

  return {
    id: `pm-${marketData.id}`,
    domain: marketData.category,
    severity,
    title: `[POLYMARKET] ${marketData.name}`,
    timestamp: marketData.lastUpdated,
    source: 'Polymarket',
    sourceType: 'reference',
    url: marketData.url,
    confidence: marketData.currentPrice > 0.5 ? marketData.currentPrice : 1 - marketData.currentPrice,
    payload: {
      marketId: marketData.id,
      priceYes: marketData.priceYes,
      priceNo: marketData.priceNo,
      trend: marketData.changes.trend,
      change1h: marketData.changes['1h'],
      change24h: marketData.changes['24h'],
      volume: marketData.volume,
      liquidity: marketData.liquidity,
      alert: marketData.alert
    },
    thesis,
    whyNow,
    nextMoves,
    watchIndicators: [
      'Price movement > 5% in 1h',
      'Volume spike >5x average',
      'News catalyst correlation'
    ]
  };
}

/**
 * Monitor all configured markets
 */
export async function monitorAllMarkets(
  markets: MonitoredMarket[]
): Promise<{ markets: MarketData[]; alerts: Alert[]; events: NervEvent[] }> {
  const history = loadPriceHistory();
  const allAlerts = loadAlerts();
  const newAlerts: Alert[] = [];
  const marketDataList: MarketData[] = [];

  console.log(`[Monitor] Starting monitoring of ${markets.length} markets...`);

  for (const market of markets) {
    console.log(`[Monitor] Checking ${market.name}...`);
    
    // Fetch current data
    const data = await fetchMarketData(market.id);
    if (!data) {
      console.warn(`[Monitor] Failed to fetch ${market.id}`);
      continue;
    }

    // Get/update history
    const marketHistory = history[market.id] || [];
    
    // Calculate price changes and detect volume spike
    const { changes, updatedHistory } = calculateChanges(
      marketHistory, 
      data.currentPrice, 
      data.volume,
      market.id
    );
    const volumeSpike = detectVolumeSpike(marketHistory, data.volume);
    
    // Update history
    history[market.id] = updatedHistory;

    // Check for alert (volume spike takes priority)
    const alert = checkAlert(market, data.currentPrice, data.volume, changes, volumeSpike);
    if (alert) {
      newAlerts.push(alert);
      allAlerts.push(alert);
      const icon = alert.type === 'VOLUME_SPIKE' ? '🔥' : '🚨';
      console.log(`[Monitor] ${icon} Alert: ${alert.message}`);
    }

    // Build market data
    const marketData: MarketData = {
      id: market.id,
      category: market.category,
      name: market.name,
      currentPrice: data.currentPrice,
      priceYes: `${(data.currentPrice * 100).toFixed(1)}¢`,
      priceNo: `${((1 - data.currentPrice) * 100).toFixed(1)}¢`,
      changes,
      volume: data.volume,
      liquidity: data.liquidity,
      lastUpdated: new Date().toISOString(),
      url: `https://polymarket.com/event/${market.id}`,
      alert
    };

    marketDataList.push(marketData);
  }

  // Save history and alerts
  savePriceHistory(history);
  if (newAlerts.length > 0) {
    saveAlerts(allAlerts.slice(-100)); // Keep last 100 alerts
  }

  // Format as NERV events
  const events = marketDataList.map(formatForNerv);

  console.log(`[Monitor] Complete: ${marketDataList.length} markets, ${newAlerts.length} new alerts`);

  return { markets: marketDataList, alerts: newAlerts, events };
}
