// Statistical Analysis Engine - 5 Intelligence Scores

import type { PolymarketMarket, MarketIntelligence } from './types';

export class StatisticalEngine {
  
  // Main analysis function - calculates all 5 scores
  analyze(market: PolymarketMarket): MarketIntelligence {
    const mispricingScore = this.calculateMispricingScore(market);
    const volumeAnomalyScore = this.calculateVolumeAnomaly(market);
    const liquidityEfficiency = this.calculateLiquidityScore(market);
    const timeUrgency = this.calculateTimeUrgency(market);
    
    // Sentiment divergence requires async news fetch - default to 50
    const sentimentDivergence = 50;
    
    // Calculate composite score (weighted average)
    const compositeScore = Math.round(
      (mispricingScore * 0.30) +
      (volumeAnomalyScore * 0.20) +
      (liquidityEfficiency * 0.15) +
      (sentimentDivergence * 0.20) +
      (timeUrgency * 0.15)
    );
    
    // Determine primary signal
    const scores = [
      { type: 'mispricing' as const, score: mispricingScore },
      { type: 'volume_spike' as const, score: volumeAnomalyScore },
      { type: 'sentiment_divergence' as const, score: sentimentDivergence },
      { type: 'time_urgent' as const, score: timeUrgency },
      { type: 'liquidity' as const, score: liquidityEfficiency },
    ];
    const primarySignal = scores.reduce((a, b) => a.score > b.score ? a : b).type;
    
    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(market);
    
    return {
      mispricingScore: Math.round(mispricingScore),
      volumeAnomalyScore: Math.round(volumeAnomalyScore),
      liquidityEfficiency: Math.round(liquidityEfficiency),
      sentimentDivergence: Math.round(sentimentDivergence),
      timeUrgency: Math.round(timeUrgency),
      compositeScore: Math.min(100, Math.max(0, compositeScore)),
      opportunityRating: this.calculateRating(compositeScore),
      primarySignal,
      confidence,
    };
  }

  // ============================================================================
  // 1. MISPricing SCORE (0-100) - Technical indicators only
  // ============================================================================
  private calculateMispricingScore(market: PolymarketMarket): number {
    const price = market.yesPrice;
    const history = market.priceHistory || [];
    
    // If no history, use distance from 50/50 as weak signal
    if (history.length < 5) {
      const distanceFrom50 = Math.abs(price - 0.5) * 100;
      return Math.min(60, distanceFrom50 * 1.2); // Cap at 60 without history
    }
    
    // 1. Z-Score (50% weight) - How unusual is current price?
    const prices = history.map(h => h.price);
    const mean = this.calculateMean(prices);
    const stdDev = this.calculateStdDev(prices, mean);
    const zScore = stdDev > 0 ? (price - mean) / stdDev : 0;
    const zScoreComponent = Math.min(100, Math.abs(zScore) * 25);
    
    // 2. Bollinger Bands (30% weight) - Mean reversion signal
    const bollingerPosition = this.calculateBollingerPosition(price, prices);
    const bollingerScore = (bollingerPosition > 0.85 || bollingerPosition < 0.15) ? 85 : 
                           (bollingerPosition > 0.7 || bollingerPosition < 0.3) ? 65 : 40;
    
    // 3. RSI (20% weight) - Oversold/overbought
    const rsi = this.calculateRSI(prices, 14);
    const rsiScore = rsi < 30 ? 90 : rsi > 70 ? 90 : 
                     rsi < 40 ? 75 : rsi > 60 ? 75 : 50;
    
    // Weighted composite
    return (zScoreComponent * 0.50) + (bollingerScore * 0.30) + (rsiScore * 0.20);
  }

  // ============================================================================
  // 2. VOLUME ANOMALY SCORE (0-100)
  // ============================================================================
  private calculateVolumeAnomaly(market: PolymarketMarket): number {
    const currentVolume = market.volume24h || 0;
    const history = market.volumeHistory || [];
    
    // If no history, use liquidity ratio as proxy
    if (history.length < 3) {
      const volumeToLiquidity = market.liquidity > 0 ? 
        (currentVolume / market.liquidity) : 0;
      return Math.min(70, volumeToLiquidity * 50);
    }
    
    const volumes = history.map(h => h.volume);
    const avgVolume = this.calculateMean(volumes);
    const stdDev = this.calculateStdDev(volumes, avgVolume);
    
    // Z-score of volume
    const volumeZScore = stdDev > 0 ? (currentVolume - avgVolume) / stdDev : 0;
    const zScoreComponent = Math.min(80, Math.max(0, volumeZScore * 15));
    
    // Velocity score (ratio to average)
    const velocity = avgVolume > 0 ? currentVolume / avgVolume : 1;
    const velocityScore = velocity > 3 ? 90 : velocity > 2 ? 75 : velocity > 1.5 ? 60 : 40;
    
    // Whale detection proxy (large volume spike)
    const whaleScore = velocity > 5 ? 100 : velocity > 3 ? 70 : 0;
    
    return (zScoreComponent * 0.5) + (velocityScore * 0.3) + (whaleScore * 0.2);
  }

  // ============================================================================
  // 3. LIQUIDITY EFFICIENCY SCORE (0-100)
  // ============================================================================
  private calculateLiquidityScore(market: PolymarketMarket): number {
    const liquidity = market.liquidity;
    
    // Depth score based on absolute liquidity
    // $5M+ = excellent, $1M+ = good, $500K+ = acceptable
    let depthScore: number;
    if (liquidity >= 5000000) depthScore = 100;
    else if (liquidity >= 2000000) depthScore = 85;
    else if (liquidity >= 1000000) depthScore = 70;
    else if (liquidity >= 500000) depthScore = 55;
    else if (liquidity >= 100000) depthScore = 40;
    else depthScore = 25;
    
    // Spread score if bid/ask available
    let spreadScore = 50; // default
    if (market.bestBid !== undefined && market.bestAsk !== undefined && market.midPrice) {
      const spread = market.bestAsk - market.bestBid;
      const spreadPercent = spread / market.midPrice;
      spreadScore = spreadPercent < 0.005 ? 100 :
                    spreadPercent < 0.01 ? 90 :
                    spreadPercent < 0.02 ? 75 :
                    spreadPercent < 0.05 ? 55 : 35;
    }
    
    // Volume to liquidity ratio
    const volume24h = market.volume24h || 0;
    const turnoverRatio = liquidity > 0 ? volume24h / liquidity : 0;
    const turnoverScore = Math.min(100, turnoverRatio * 100);
    
    return (depthScore * 0.60) + (spreadScore * 0.25) + (turnoverScore * 0.15);
  }

  // ============================================================================
  // 4. TIME URGENCY SCORE (0-100)
  // ============================================================================
  private calculateTimeUrgency(market: PolymarketMarket): number {
    if (!market.endDate) return 20; // No deadline = low urgency
    
    const end = new Date(market.endDate).getTime();
    const now = Date.now();
    const daysUntil = (end - now) / (1000 * 60 * 60 * 24);
    
    if (daysUntil < 0) return 100;   // Already ended (resolving)
    if (daysUntil < 1) return 100;   // < 24 hours
    if (daysUntil < 3) return 90;    // < 3 days
    if (daysUntil < 7) return 80;    // < 1 week
    if (daysUntil < 14) return 70;   // < 2 weeks
    if (daysUntil < 30) return 55;   // < 1 month
    if (daysUntil < 90) return 40;   // < 3 months
    return 20;                        // > 3 months
  }

  // ============================================================================
  // 5. SENTIMENT DIVERGENCE (placeholder - requires async news fetch)
  // ============================================================================
  async calculateSentimentDivergence(
    market: PolymarketMarket,
    newsSentiment: { score: number; confidence: number }
  ): Promise<number> {
    // Compare news sentiment implied probability to market price
    const marketProb = market.yesPrice;
    const newsProb = (newsSentiment.score + 1) / 2; // Convert -1..1 to 0..1
    
    const divergence = Math.abs(newsProb - marketProb);
    const confidenceFactor = newsSentiment.confidence;
    
    // High divergence with high confidence = high score
    return Math.min(100, divergence * 200 * confidenceFactor);
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  private calculateStdDev(values: number[], mean: number): number {
    if (values.length < 2) return 0;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
  
  private calculateBollingerPosition(currentPrice: number, prices: number[]): number {
    if (prices.length < 20) return 0.5;
    
    const period = Math.min(20, prices.length);
    const recentPrices = prices.slice(-period);
    const sma = this.calculateMean(recentPrices);
    const stdDev = this.calculateStdDev(recentPrices, sma);
    
    if (stdDev === 0) return 0.5;
    
    // Position within bands (0 = lower band, 0.5 = middle, 1 = upper band)
    const upperBand = sma + (2 * stdDev);
    const lowerBand = sma - (2 * stdDev);
    
    return Math.max(0, Math.min(1, (currentPrice - lowerBand) / (upperBand - lowerBand)));
  }
  
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    // Calculate initial averages
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }
  
  private calculateConfidence(market: PolymarketMarket): number {
    let confidence = 50;
    
    // Higher liquidity = higher confidence
    if (market.liquidity > 5000000) confidence += 20;
    else if (market.liquidity > 1000000) confidence += 10;
    
    // Higher volume = higher confidence
    if (market.volume24h && market.volume24h > 1000000) confidence += 15;
    
    // Price not at extremes = higher confidence
    if (market.yesPrice > 0.1 && market.yesPrice < 0.9) confidence += 10;
    
    return Math.min(100, confidence);
  }
  
  private calculateRating(score: number): 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' {
    if (score >= 85) return 'A+';
    if (score >= 75) return 'A';
    if (score >= 65) return 'B+';
    if (score >= 55) return 'B';
    if (score >= 45) return 'C';
    return 'D';
  }
}

// Singleton instance
let engine: StatisticalEngine | null = null;

export function getStatisticalEngine(): StatisticalEngine {
  if (!engine) {
    engine = new StatisticalEngine();
  }
  return engine;
}
