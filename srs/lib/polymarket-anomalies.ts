/**
 * Polymarket Anomaly Detection
 * Fetches markets via backend API to avoid CORS issues
 */

export const TAGS = {
  GEOPOLITICS: 100265,
  ECONOMY: 100328,
  FINANCE: 120,
  TECH: 1401,
  CRYPTO: 21,
} as const;

export const CATEGORY_NAMES: Record<number, string> = {
  [TAGS.GEOPOLITICS]: 'Geopolitics',
  [TAGS.ECONOMY]: 'Economy',
  [TAGS.FINANCE]: 'Finance',
  [TAGS.TECH]: 'Tech',
  [TAGS.CRYPTO]: 'Crypto',
};

export type AnomalyType = 
  | 'volume_spike' 
  | 'price_swing' 
  | 'volume_accel' 
  | 'liquidity' 
  | 'smart_money';

export interface PolymarketMarket {
  id: string;
  question: string;
  description?: string;
  slug?: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  volume24h?: number;
  liquidity: number;
  category?: string;
  endDate?: string;
  tags?: number[];
  change24h?: number;
  spread?: number;
}

export interface AnomalyResult {
  market: PolymarketMarket;
  category: string;
  score: number;
  anomalies: AnomalyType[];
  metrics: {
    volumeZScore: number;
    priceChangePercent: number;
    volumeAcceleration: number;
    spread: number;
    avgVolume: number;
  };
}

// Calculate mean
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Calculate standard deviation
function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = mean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

// Fetch markets via backend API (avoids CORS)
async function fetchMarketsFromAPI(): Promise<PolymarketMarket[]> {
  try {
    console.log('[CLIENT] Fetching from /api/search?action=opportunities');
    const response = await fetch('/api/search?action=opportunities');
    
    if (!response.ok) {
      console.error('[CLIENT] API error:', response.status);
      return [];
    }
    
    const data = await response.json();
    console.log(`[CLIENT] API returned ${data.opportunities?.length || 0} opportunities`);
    
    if (!data.ok || !data.opportunities) {
      return [];
    }
    
    // Convert to PolymarketMarket format
    return data.opportunities.map((opp: any) => ({
      id: opp.market.id,
      question: opp.market.question,
      description: opp.market.description,
      slug: opp.market.slug,
      yesPrice: opp.market.yesPrice,
      noPrice: opp.market.noPrice,
      volume: opp.market.volume,
      volume24h: opp.market.volume24h || opp.market.volume,
      liquidity: opp.market.liquidity,
      category: opp.market.category,
      endDate: opp.market.endDate,
      tags: [],
      change24h: opp.market.change24h || 0,
    }));
  } catch (error) {
    console.error('[CLIENT] Error fetching from API:', error);
    return [];
  }
}

// Detect anomalies in a category of markets
export function detectAnomalies(
  markets: PolymarketMarket[], 
  categoryName: string
): AnomalyResult[] {
  if (markets.length === 0) return [];
  
  // Calculate category statistics
  const volumes = markets.map(m => m.volume24h || m.volume || 0);
  const avgVolume = mean(volumes);
  const stdVolume = stdDev(volumes);
  
  return markets.map(market => {
    const anomalies: AnomalyType[] = [];
    let score = 0;
    
    const volume24h = market.volume24h || market.volume || 0;
    
    // 1. Volume Spike: Z-score > 2 above category mean
    let volumeZScore = 0;
    if (stdVolume > 0) {
      volumeZScore = (volume24h - avgVolume) / stdVolume;
    }
    if (volumeZScore > 2) {
      anomalies.push('volume_spike');
      score += volumeZScore * 1.5;
    }
    
    // 2. Price Swing: > 10% probability change
    let priceChangePercent = Math.abs(market.change24h || 0);
    if (priceChangePercent === 0 && market.yesPrice) {
      priceChangePercent = Math.abs((market.yesPrice - 0.5) / 0.5 * 100);
    }
    if (priceChangePercent > 10) {
      anomalies.push('price_swing');
      score += priceChangePercent * 0.2;
    }
    
    // 3. Volume Acceleration: Today > 3x weekly average
    const weeklyAvg = avgVolume * 7;
    const volumeAcceleration = weeklyAvg > 0 ? volume24h / (weeklyAvg / 7) : 1;
    if (volumeAcceleration > 3) {
      anomalies.push('volume_accel');
      score += volumeAcceleration * 1.2;
    }
    
    // 4. Liquidity Anomaly: Spread < 2¢ + above average volume
    const spread = Math.abs(market.yesPrice - (1 - market.yesPrice));
    if (spread < 0.02 && volume24h > avgVolume) {
      anomalies.push('liquidity');
      score += 10; // Liquidity bonus
    }
    
    // 5. Smart Money: High volume + tight spread + price move
    if (volumeZScore > 1.5 && spread < 0.05 && priceChangePercent > 5) {
      anomalies.push('smart_money');
      score += 15; // Smart money bonus
    }
    
    return {
      market,
      category: categoryName,
      score,
      anomalies,
      metrics: {
        volumeZScore,
        priceChangePercent,
        volumeAcceleration,
        spread,
        avgVolume,
      },
    };
  });
}

// Get all anomalies via backend API
export async function getAllAnomalies(): Promise<AnomalyResult[]> {
  console.log('[CLIENT] Getting all anomalies via API');
  
  const markets = await fetchMarketsFromAPI();
  console.log(`[CLIENT] Processing ${markets.length} markets`);
  
  if (markets.length === 0) {
    return [];
  }
  
  // Group by category
  const marketsByCategory = new Map<string, PolymarketMarket[]>();
  
  markets.forEach(market => {
    const cat = market.category || 'Unknown';
    if (!marketsByCategory.has(cat)) {
      marketsByCategory.set(cat, []);
    }
    marketsByCategory.get(cat)!.push(market);
  });
  
  // Detect anomalies per category
  const allAnomalies: AnomalyResult[] = [];
  
  marketsByCategory.forEach((categoryMarkets, categoryName) => {
    console.log(`[CLIENT] Processing ${categoryMarkets.length} markets for ${categoryName}`);
    const anomalies = detectAnomalies(categoryMarkets, categoryName);
    const withAnomalies = anomalies.filter(a => a.anomalies.length > 0);
    console.log(`[CLIENT] Found ${withAnomalies.length} anomalies in ${categoryName}`);
    allAnomalies.push(...anomalies);
  });
  
  // Sort by score descending
  const sorted = allAnomalies.sort((a, b) => b.score - a.score);
  console.log(`[CLIENT] Total: ${sorted.filter(a => a.anomalies.length > 0).length} markets with anomalies`);
  
  return sorted;
}

// Filter presets
export type FilterPreset = 'all' | 'smart_money' | 'major' | 'volatility';

export function filterByPreset(
  results: AnomalyResult[], 
  preset: FilterPreset
): AnomalyResult[] {
  switch (preset) {
    case 'smart_money':
      return results.filter(r => r.anomalies.includes('smart_money'));
    case 'major':
      return results.filter(r => r.market.liquidity > 1000000 || r.anomalies.length >= 2);
    case 'volatility':
      return results.filter(r => 
        r.anomalies.includes('price_swing') || r.metrics.priceChangePercent > 10
      );
    default:
      return results;
  }
}

// Get anomaly badge config
export function getAnomalyConfig(type: AnomalyType) {
  switch (type) {
    case 'volume_spike':
      return { emoji: '🔥', label: 'VOLUME SPIKE', color: 'text-orange-500' };
    case 'price_swing':
      return { emoji: '📈', label: 'PRICE SWING', color: 'text-green-500' };
    case 'volume_accel':
      return { emoji: '⚡', label: 'ACCEL', color: 'text-yellow-500' };
    case 'liquidity':
      return { emoji: '💧', label: 'LIQUIDITY', color: 'text-blue-500' };
    case 'smart_money':
      return { emoji: '🧠', label: 'SMART MONEY', color: 'text-purple-500' };
    default:
      return { emoji: '•', label: type, color: 'text-gray-500' };
  }
}
