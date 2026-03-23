/**
 * Polymarket Anomaly Detection
 * Fetches markets by category tags and detects anomalies
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

const SPORTS_BLACKLIST = [
  'fifa', 'world cup', 'nba', 'nhl', 'nfl', 'mlb', 'stanley cup', 'finals',
  'uefa', 'champions league', 'grizzlies', 'senators', 'warriors', 'mavericks',
  'celtics', 'lakers', 'neymar', 'soccer', 'football', 'premier league', 'la liga',
  'serie a', 'bundesliga', 'lpl', 'lck', 'csgo', 'dota', 'valorant', 'overwatch',
  'call of duty', 'fortnite', 'apex legends', 'rocket league', 'tennis', 'golf',
  'baseball', 'basketball', 'hockey', 'cricket', 'rugby', 'boxing', 'mma', 'ufc',
  'wwe', 'formula 1', 'f1', 'nascar', 'motogp', 'olympics', 'esports'
];

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
  // Additional fields for anomaly detection
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

// Check if market is sports-related
export function isSportsMarket(market: PolymarketMarket): boolean {
  const text = `${market.question} ${market.description || ''}`.toLowerCase();
  return SPORTS_BLACKLIST.some(term => text.includes(term.toLowerCase()));
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

// Fetch markets for a single tag
async function fetchMarketsByTag(tagId: number, limit: number = 10): Promise<PolymarketMarket[]> {
  try {
    const response = await fetch(
      `https://gamma-api.polymarket.com/markets?tag_id=${tagId}&active=true&closed=false&liquidityMin=50000&limit=${limit}`,
      { headers: { Accept: 'application/json' } }
    );
    
    if (!response.ok) {
      console.error(`Failed to fetch tag ${tagId}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    const markets = Array.isArray(data) ? data : data.markets || [];
    
    return markets.map((m: any) => ({
      id: m.id || m.conditionId,
      question: m.question,
      description: m.description,
      slug: m.slug,
      yesPrice: parseFloat(m.outcomePrices ? JSON.parse(m.outcomePrices)[0] : m.yesPrice) || 0.5,
      noPrice: parseFloat(m.outcomePrices ? JSON.parse(m.outcomePrices)[1] : m.noPrice) || 0.5,
      volume: parseFloat(m.volume) || 0,
      volume24h: parseFloat(m.volume24h) || parseFloat(m.volume) || 0,
      liquidity: parseFloat(m.liquidity) || 0,
      category: m.category,
      endDate: m.endDate || m.expirationDate,
      tags: m.tags || [],
      change24h: parseFloat(m.change24h) || 0,
    }));
  } catch (error) {
    console.error(`Error fetching tag ${tagId}:`, error);
    return [];
  }
}

// Fetch markets from all tags
export async function fetchMarketsByTags(limitPerTag: number = 10): Promise<Map<number, PolymarketMarket[]>> {
  const tagIds = Object.values(TAGS);
  const results = new Map<number, PolymarketMarket[]>();
  
  await Promise.all(
    tagIds.map(async (tagId) => {
      const markets = await fetchMarketsByTag(tagId, limitPerTag);
      // Filter out sports markets
      const filtered = markets.filter(m => !isSportsMarket(m));
      results.set(tagId, filtered);
    })
  );
  
  return results;
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
    // Use change24h if available, otherwise calculate from prices
    let priceChangePercent = Math.abs(market.change24h || 0);
    if (priceChangePercent === 0 && market.yesPrice) {
      // Estimate from implied volatility if available
      priceChangePercent = Math.abs((market.yesPrice - 0.5) / 0.5 * 100);
    }
    if (priceChangePercent > 10) {
      anomalies.push('price_swing');
      score += priceChangePercent * 0.2;
    }
    
    // 3. Volume Acceleration: Today > 3x weekly average
    // Estimate weekly average as 7x daily (simplified)
    const weeklyAvg = avgVolume * 7;
    const volumeAcceleration = weeklyAvg > 0 ? volume24h / (weeklyAvg / 7) : 1;
    if (volumeAcceleration > 3) {
      anomalies.push('volume_accel');
      score += volumeAcceleration * 1.2;
    }
    
    // 4. Liquidity Anomaly: Spread < 2¢ + above average volume
    const spread = Math.abs(market.yesPrice - (1 - market.yesPrice)); // Simplified spread calc
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

// Get all anomalies across all categories
export async function getAllAnomalies(limitPerTag: number = 10): Promise<AnomalyResult[]> {
  const marketsByTag = await fetchMarketsByTags(limitPerTag);
  
  const allAnomalies: AnomalyResult[] = [];
  
  marketsByTag.forEach((markets, tagId) => {
    const categoryName = CATEGORY_NAMES[tagId] || 'Unknown';
    const anomalies = detectAnomalies(markets, categoryName);
    allAnomalies.push(...anomalies);
  });
  
  // Sort by score descending
  return allAnomalies.sort((a, b) => b.score - a.score);
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
