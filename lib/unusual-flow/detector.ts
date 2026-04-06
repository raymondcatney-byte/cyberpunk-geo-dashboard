import { Redis } from '@upstash/redis';
import { MarketData, Trade, UnusualFlowSignal, BaselineData } from './types';

// Initialize Redis client lazily to handle missing env vars gracefully
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!url || !token) {
      console.warn('[PMFlowDetector] Redis not configured - skipping storage');
      return null;
    }
    
    redis = new Redis({ url, token });
  }
  return redis;
}

export class PMFlowDetector {
  private readonly THRESHOLDS = {
    WHALE_MIN_USD: 5000,
    WHALE_VOLUME_PCT: 0.01,
    VOLUME_ZSCORE: 2.5,
    EXTREME_PROB: 0.15,
    FLOW_RATIO: 2.5,
    LATE_MONEY_HOURS: 48
  };

  async scanAllMarkets(): Promise<UnusualFlowSignal[]> {
    console.log('[PMFlowDetector] Starting market scan...');
    const markets = await this.fetchActiveMarkets();
    const signals: UnusualFlowSignal[] = [];

    console.log(`[PMFlowDetector] Scanning ${markets.length} markets...`);

    for (const market of markets.slice(0, 100)) {
      try {
        const marketSignals = await this.scanMarket(market);
        signals.push(...marketSignals);
      } catch (error) {
        console.warn(`[PMFlowDetector] Failed to scan market ${market.id}:`, error);
      }
    }

    // Sort by severity (most severe first), then by size
    const severityOrder = { WHALE_ALERT: 0, SUSPICIOUS: 1, UNUSUAL: 2, NOTABLE: 3 };
    signals.sort((a, b) => {
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.activity.size - a.activity.size;
    });

    await this.storeSignals(signals);
    console.log(`[PMFlowDetector] Scan complete. Generated ${signals.length} signals.`);
    return signals.slice(0, 50);
  }

  private async scanMarket(market: MarketData): Promise<UnusualFlowSignal[]> {
    const signals: UnusualFlowSignal[] = [];
    const [trades, baseline] = await Promise.all([
      this.fetchRecentTrades(market.id),
      this.getBaseline(market.id)
    ]);

    const hoursToRes = this.getHoursToResolution(market);

    // WHALE ORDERS
    const whales = trades.filter(t => 
      t.sizeUsd >= this.THRESHOLDS.WHALE_MIN_USD ||
      t.sizeUsd >= market.volume24h * this.THRESHOLDS.WHALE_VOLUME_PCT
    );

    for (const whale of whales) {
      const score = this.calculateSmartMoneyScore(whale, market, hoursToRes);
      signals.push({
        id: `whale_${whale.id}_${Date.now()}`,
        timestamp: Date.now(),
        marketId: market.id,
        marketQuestion: market.question,
        marketSlug: market.slug,
        category: market.category,
        icon: market.icon,
        type: 'WHALE_ORDER',
        side: whale.side,
        severity: this.getSeverity(whale.sizeUsd, score),
        activity: {
          size: whale.sizeUsd,
          price: whale.price,
          impliedProbability: whale.price,
          marketProbability: market.currentPrice,
          edge: Math.abs(whale.price - market.currentPrice)
        },
        context: {
          volume24h: market.volume24h,
          avgTradeSize: market.volume24h / (trades.length || 1),
          hoursToResolution: hoursToRes,
          smartMoneyScore: score
        },
        rationale: this.buildRationale('whale', whale, market, score, hoursToRes),
        expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour TTL
      });
    }

    // VOLUME SPIKE
    const hourlyVolume = trades
      .filter(t => t.timestamp > Date.now() - 3600000)
      .reduce((sum, t) => sum + t.sizeUsd, 0);

    if (baseline && baseline.hourlyAvg > 0) {
      const zScore = (hourlyVolume - baseline.hourlyAvg) / baseline.hourlyStd;
      
      if (zScore >= this.THRESHOLDS.VOLUME_ZSCORE) {
        const dominantSide = this.getDominantSide(trades);
        signals.push({
          id: `vol_${market.id}_${Date.now()}`,
          timestamp: Date.now(),
          marketId: market.id,
          marketQuestion: market.question,
          marketSlug: market.slug,
          category: market.category,
          icon: market.icon,
          type: 'VOLUME_SPIKE',
          side: dominantSide,
          severity: zScore > 4 ? 'SUSPICIOUS' : 'UNUSUAL',
          activity: {
            size: hourlyVolume,
            price: market.currentPrice,
            impliedProbability: market.currentPrice,
            marketProbability: market.currentPrice,
            edge: 0
          },
          context: {
            volume24h: market.volume24h,
            avgTradeSize: market.volume24h / 24,
            hoursToResolution: hoursToRes,
            smartMoneyScore: Math.min(100, zScore * 20)
          },
          rationale: `${zScore.toFixed(1)}σ volume surge. ${(hourlyVolume/baseline.hourlyAvg).toFixed(1)}x normal flow.`,
          expiresAt: Date.now() + (30 * 60 * 1000) // 30 min TTL
        });
      }
    }

    // EXTREME BETS
    const extremes = trades.filter(t => 
      t.price <= this.THRESHOLDS.EXTREME_PROB ||
      t.price >= (1 - this.THRESHOLDS.EXTREME_PROB)
    );

    for (const extreme of extremes) {
      const isContrarian = Math.abs(extreme.price - market.currentPrice) > 0.15;
      
      signals.push({
        id: `extreme_${extreme.id}_${Date.now()}`,
        timestamp: Date.now(),
        marketId: market.id,
        marketQuestion: market.question,
        marketSlug: market.slug,
        category: market.category,
        icon: market.icon,
        type: 'EXTREME_PROB',
        side: extreme.side,
        severity: extreme.sizeUsd > 3000 ? 'UNUSUAL' : 'NOTABLE',
        activity: {
          size: extreme.sizeUsd,
          price: extreme.price,
          impliedProbability: extreme.price,
          marketProbability: market.currentPrice,
          edge: Math.abs(extreme.price - market.currentPrice)
        },
        context: {
          volume24h: market.volume24h,
          avgTradeSize: market.volume24h / (trades.length || 1),
          hoursToResolution: hoursToRes,
          smartMoneyScore: isContrarian ? 70 : 40
        },
        rationale: isContrarian 
          ? `Contrarian ${(extreme.price * 100).toFixed(0)}% bet vs market ${(market.currentPrice * 100).toFixed(0)}%`
          : `High conviction ${(extreme.price * 100).toFixed(0)}% position`,
        expiresAt: Date.now() + (45 * 60 * 1000) // 45 min TTL
      });
    }

    // LATE MONEY
    if (hoursToRes < this.THRESHOLDS.LATE_MONEY_HOURS && trades.length > 0) {
      const recentVolume = trades
        .filter(t => t.timestamp > Date.now() - 3600000)
        .reduce((sum, t) => sum + t.sizeUsd, 0);

      if (recentVolume > 2000) {
        const dominantSide = this.getDominantSide(trades);
        signals.push({
          id: `late_${market.id}_${Date.now()}`,
          timestamp: Date.now(),
          marketId: market.id,
          marketQuestion: market.question,
          marketSlug: market.slug,
          category: market.category,
          icon: market.icon,
          type: 'LATE_MONEY',
          side: dominantSide,
          severity: recentVolume > 10000 ? 'SUSPICIOUS' : 'UNUSUAL',
          activity: {
            size: recentVolume,
            price: market.currentPrice,
            impliedProbability: market.currentPrice,
            marketProbability: market.currentPrice,
            edge: 0
          },
          context: {
            volume24h: market.volume24h,
            avgTradeSize: market.volume24h / (trades.length || 1),
            hoursToResolution: hoursToRes,
            smartMoneyScore: 85
          },
          rationale: `Late money (${Math.floor(hoursToRes)}h to resolve): $${recentVolume.toLocaleString()} in last hour`,
          expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour TTL
        });
      }
    }

    return this.deduplicate(signals);
  }

  private async storeSignals(signals: UnusualFlowSignal[]) {
    const r = getRedis();
    if (!r) {
      console.warn('[PMFlowDetector] Redis not available - skipping storage');
      return;
    }

    try {
      const pipeline = r.pipeline();
      
      pipeline.zadd('pm:flow:alerts', 
        signals.map(s => ({ score: s.timestamp, member: JSON.stringify(s) }))
      );
      
      // Keep only last 100 alerts
      pipeline.zremrangebyrank('pm:flow:alerts', 0, -101);
      pipeline.expire('pm:flow:alerts', 7 * 24 * 60 * 60); // 7 days
      
      await pipeline.exec();
    } catch (error) {
      console.warn('[PMFlowDetector] Redis pipeline failed:', error);
    }
  }

  private calculateSmartMoneyScore(trade: Trade, market: MarketData, hoursToRes: number): number {
    let score = 0;
    
    // Size component (up to 35 points)
    score += Math.min(35, (trade.sizeUsd / 5000) * 5);
    
    // Edge component (up to 30 points)
    const edge = Math.abs(trade.price - market.currentPrice);
    score += Math.min(30, edge * 200);
    
    // Timing component (up to 25 points for late bets)
    if (hoursToRes < 6) score += 25;
    else if (hoursToRes < 24) score += 15;
    else if (hoursToRes < 72) score += 10;
    
    // Contrarian bonus (up to 10 points)
    if ((trade.side === 'YES' && trade.price < market.currentPrice) ||
        (trade.side === 'NO' && trade.price > market.currentPrice)) {
      score += 10;
    }
    
    return Math.min(100, Math.round(score));
  }

  private getSeverity(sizeUsd: number, score: number): UnusualFlowSignal['severity'] {
    if (sizeUsd >= 50000 || score >= 85) return 'WHALE_ALERT';
    if (sizeUsd >= 15000 || score >= 70) return 'SUSPICIOUS';
    if (sizeUsd >= 5000 || score >= 55) return 'UNUSUAL';
    return 'NOTABLE';
  }

  private buildRationale(type: string, trade: Trade, market: MarketData, score: number, hours: number): string {
    const parts: string[] = [];
    
    if (type === 'whale') {
      parts.push(`${trade.side} $${trade.sizeUsd.toLocaleString()}`);
      if (score > 75) parts.push('high conviction');
      if (hours < 24) parts.push('late timing');
      if (Math.abs(trade.price - market.currentPrice) > 0.1) parts.push('contrarian edge');
    }
    
    return parts.join('. ') + '.';
  }

  private deduplicate(signals: UnusualFlowSignal[]): UnusualFlowSignal[] {
    const seen = new Set<string>();
    return signals.filter(s => {
      const key = `${s.marketId}-${s.type}-${s.side}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private getHoursToResolution(market: MarketData): number {
    if (!market.resolutionTime) return 999;
    return Math.max(0, (new Date(market.resolutionTime).getTime() - Date.now()) / 3600000);
  }

  private getDominantSide(trades: Trade[]): 'YES' | 'NO' {
    const yesVol = trades.filter(t => t.side === 'YES').reduce((s, t) => s + t.sizeUsd, 0);
    const noVol = trades.filter(t => t.side === 'NO').reduce((s, t) => s + t.sizeUsd, 0);
    return yesVol > noVol ? 'YES' : 'NO';
  }

  private async fetchActiveMarkets(): Promise<MarketData[]> {
    try {
      const res = await fetch('https://gamma-api.polymarket.com/markets?active=true&sort=volume&limit=100', {
        next: { revalidate: 60 }
      });
      const data = await res.json();
      return data.map((m: any) => ({
        id: m.id || m.marketSlug,
        question: m.question,
        category: m.category || 'Unknown',
        currentPrice: m.outcomes?.[0]?.price || 0.5,
        volume24h: parseFloat(m.volume24hr || 0),
        liquidity: m.liquidity || 0,
        resolutionTime: m.resolutionDate,
        slug: m.slug || m.id || m.marketSlug,
        icon: m.icon
      }));
    } catch (error) {
      console.error('[PMFlowDetector] Failed to fetch markets:', error);
      return [];
    }
  }

  private async fetchRecentTrades(marketId: string): Promise<Trade[]> {
    try {
      const res = await fetch(`https://clob.polymarket.com/trades?market=${marketId}&limit=200`, {
        next: { revalidate: 30 }
      });
      const data = await res.json();
      return data.trades?.map((t: any) => ({
        id: t.id || `${t.transactionHash}-${t.logIndex}`,
        side: t.side === 0 ? 'YES' : 'NO',
        sizeUsd: parseFloat(t.size) * parseFloat(t.price),
        price: parseFloat(t.price),
        timestamp: new Date(t.timestamp).getTime()
      })) || [];
    } catch {
      return [];
    }
  }

  private async getBaseline(marketId: string): Promise<BaselineData | null> {
    const r = getRedis();
    if (!r) return null;

    try {
      const cached = await r.get(`pm:flow:baseline:${marketId}`);
      if (cached) return cached as BaselineData;
    } catch {
      // Fallback to null
    }
    return null;
  }
}

export const detector = new PMFlowDetector();
