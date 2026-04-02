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
}

export interface PriceChanges {
  '1h': number | null;
  '24h': number | null;
  '7d': number | null;
  trend: 'surging' | 'rising' | 'stable' | 'falling' | 'crashing';
}

export interface Alert {
  timestamp: string;
  marketId: string;
  marketName: string;
  type: 'PRICE_MOVEMENT' | 'TREND_ALERT';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  currentPrice: number;
  change1h: number | null;
  trend: string;
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

// Price history storage
interface PriceHistory {
  [marketId: string]: MarketReading[];
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
 * Fetch market data from Polymarket Gamma API
 */
export async function fetchMarketData(marketId: string): Promise<{
  currentPrice: number;
  volume: number;
  liquidity: number;
  endDate?: string;
} | null> {
  try {
    const response = await fetch(
      `https://gamma-api.polymarket.com/events?slug=${encodeURIComponent(marketId)}&active=true`,
      {
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch ${marketId}: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`No data found for ${marketId}`);
      return null;
    }

    const event = data[0];
    const markets = event.markets || [];
    
    if (markets.length === 0) {
      return null;
    }

    const market = markets[0];
    
    // Parse outcome prices (stored as JSON string like "[0.65, 0.35]")
    let currentPrice = 0.5;
    try {
      const outcomePrices = market.outcomePrices;
      if (typeof outcomePrices === 'string') {
        const prices = JSON.parse(outcomePrices);
        currentPrice = parseFloat(prices[0]) || 0.5;
      } else if (Array.isArray(outcomePrices)) {
        currentPrice = parseFloat(outcomePrices[0]) || 0.5;
      }
    } catch {
      currentPrice = 0.5;
    }

    return {
      currentPrice,
      volume: parseFloat(market.volumeNum || market.volume || 0),
      liquidity: parseFloat(market.liquidityNum || market.liquidity || 0),
      endDate: market.endDate || event.endDate
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
  marketId: string
): PriceChanges {
  const now = new Date();
  const nowISO = now.toISOString();

  // Add current reading
  const updatedHistory = [...history, { timestamp: nowISO, price: currentPrice }];
  
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

  return changes;
}

/**
 * Check if price movement triggers an alert
 */
export function checkAlert(
  market: MonitoredMarket,
  currentPrice: number,
  changes: PriceChanges
): Alert | undefined {
  const threshold = market.threshold;

  // Check for significant price movement
  if (changes['1h'] !== null && Math.abs(changes['1h']) >= threshold) {
    return {
      timestamp: new Date().toISOString(),
      marketId: market.id,
      marketName: market.name,
      type: 'PRICE_MOVEMENT',
      severity: Math.abs(changes['1h']) >= threshold * 2 ? 'high' : 'medium',
      message: `${market.name} ${changes['1h']! > 0 ? '↑' : '↓'} ${(Math.abs(changes['1h']!) * 100).toFixed(1)}% in 1h`,
      currentPrice,
      change1h: changes['1h'],
      trend: changes.trend
    };
  }

  // Check for trend alert
  if (changes.trend === 'surging' || changes.trend === 'crashing') {
    return {
      timestamp: new Date().toISOString(),
      marketId: market.id,
      marketName: market.name,
      type: 'TREND_ALERT',
      severity: changes.trend === 'crashing' ? 'critical' : 'high',
      message: `${market.name} is ${changes.trend.toUpperCase()}: ${(currentPrice * 100).toFixed(1)}¢`,
      currentPrice,
      change1h: changes['1h'],
      trend: changes.trend
    };
  }

  return undefined;
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
    severity = marketData.alert.severity;
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
    whyNow: `Market odds: ${marketData.priceYes} Yes / ${marketData.priceNo} No`,
    nextMoves: [
      `Monitor ${marketData.name} for continued ${(change1h || 0) > 0 ? 'strength' : 'weakness'}`,
      marketData.liquidity < 100000 
        ? 'Check Polymarket for order book depth' 
        : 'High liquidity - reliable signal'
    ],
    watchIndicators: [
      'Price movement > 5% in 1h',
      'Volume spike',
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
    const changes = calculateChanges(marketHistory, data.currentPrice, market.id);
    
    // Update history
    const updatedHistory = [...marketHistory, { timestamp: new Date().toISOString(), price: data.currentPrice }];
    history[market.id] = updatedHistory.slice(-100);

    // Check for alert
    const alert = checkAlert(market, data.currentPrice, changes);
    if (alert) {
      newAlerts.push(alert);
      allAlerts.push(alert);
      console.log(`[Monitor] 🚨 Alert: ${alert.message}`);
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
