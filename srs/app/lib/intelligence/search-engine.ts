// Main Search Engine - Orchestrates all components

import type { 
  SearchIntent, 
  SearchResult, 
  PolymarketMarket,
  MarketIntelligence 
} from './types';
import { getPolymarketClient } from './client';
import { getIntentParser } from './intent-parser';
import { getStatisticalEngine } from './statistical-engine';
import { getSynthesisEngine } from './synthesis';

export interface SearchOptions {
  limit?: number;
  includeSynthesis?: boolean;
  minCompositeScore?: number;
}

export class PolymarketSearchEngine {
  private client = getPolymarketClient();
  private intentParser = getIntentParser();
  private statisticalEngine = getStatisticalEngine();
  private synthesisEngine = getSynthesisEngine();

  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const { 
      limit = 20, 
      includeSynthesis = true,
      minCompositeScore = 0 
    } = options;

    console.log(`[Search] Query: "${query}"`);

    // Step 1: Parse search intent
    const intent = this.intentParser.parse(query);
    console.log(`[Search] Intent: ${intent.type} (${Math.round(intent.confidence)}% confidence)`);
    console.log(`[Search] ${this.intentParser.explainIntent(intent)}`);

    // Step 2: Fetch markets from API
    const markets = await this.client.fetchMarkets();
    console.log(`[Search] Fetched ${markets.length} markets`);

    // Step 3: Calculate intelligence for each market
    const withIntelligence = markets.map(market => ({
      market,
      intelligence: this.statisticalEngine.analyze(market)
    }));

    // Step 4: Apply intent filters
    const filtered = this.applyIntentFilters(withIntelligence, intent);
    console.log(`[Search] Filtered to ${filtered.length} markets by intent`);

    // Step 5: Add synthesis (if enabled)
    let withSynthesis: SearchResult[];
    
    if (includeSynthesis) {
      // Process synthesis in batches to avoid overwhelming the API
      const batchSize = 5;
      withSynthesis = [];
      
      for (let i = 0; i < filtered.length; i += batchSize) {
        const batch = filtered.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async item => {
            try {
              const [news, watchtower] = await Promise.all([
                this.synthesisEngine.correlateNews(item.market),
                this.synthesisEngine.validateWithWatchtower(item.market)
              ]);

              // Calculate updated sentiment divergence now that we have news
              const sentimentDivergence = await this.calculateSentimentDivergence(
                item.market,
                news
              );

              // Update intelligence with sentiment
              const updatedIntelligence: MarketIntelligence = {
                ...item.intelligence,
                sentimentDivergence: Math.round(sentimentDivergence),
                compositeScore: this.recalculateComposite({
                  ...item.intelligence,
                  sentimentDivergence
                })
              };

              return {
                market: item.market,
                intelligence: updatedIntelligence,
                synthesis: {
                  news,
                  watchtower,
                  related: [] // Will be populated after building graph
                },
                matchReasons: [],
                relevanceScore: 0,
                rank: 0
              };
            } catch (error) {
              console.warn(`[Search] Synthesis failed for ${item.market.id}:`, error);
              return {
                market: item.market,
                intelligence: item.intelligence,
                synthesis: {
                  news: { articles: [], sentiment: 'neutral' as const, sentimentStrength: 50, divergence: 0, breakingAlert: false },
                  watchtower: { relatedAlerts: [], factualMatch: 0, trustScore: 0, validationStatus: 'unverified' as const },
                  related: []
                },
                matchReasons: [],
                relevanceScore: 0,
                rank: 0
              };
            }
          })
        );
        
        withSynthesis.push(...batchResults);
      }

      // Build knowledge graph and add related events
      const graph = this.synthesisEngine.buildKnowledgeGraph(
        withSynthesis.map(r => r.market)
      );
      
      for (const result of withSynthesis) {
        result.synthesis.related = this.synthesisEngine.findRelatedEvents(
          result.market.id,
          graph,
          3
        );
      }
    } else {
      withSynthesis = filtered.map(item => ({
        market: item.market,
        intelligence: item.intelligence,
        synthesis: {
          news: { articles: [], sentiment: 'neutral' as const, sentimentStrength: 50, divergence: 0, breakingAlert: false },
          watchtower: { relatedAlerts: [], factualMatch: 0, trustScore: 0, validationStatus: 'unverified' as const },
          related: []
        },
        matchReasons: [],
        relevanceScore: 0,
        rank: 0
      }));
    }

    // Step 6: Filter by min score
    const scoreFiltered = withSynthesis.filter(
      r => r.intelligence.compositeScore >= minCompositeScore
    );

    // Step 7: Rank results
    const ranked = this.rankResults(scoreFiltered, intent);

    // Step 8: Add match explanations
    const withExplanations = ranked.map((result, index) => ({
      ...result,
      matchReasons: this.generateMatchReasons(result, intent),
      rank: index + 1
    }));

    console.log(`[Search] Returning ${withExplanations.length} results`);
    return withExplanations.slice(0, limit);
  }

  private applyIntentFilters(
    markets: { market: PolymarketMarket; intelligence: MarketIntelligence }[],
    intent: SearchIntent
  ): { market: PolymarketMarket; intelligence: MarketIntelligence }[] {
    return markets.filter(({ market, intelligence }) => {
      // Category filter
      if (intent.category && market.category !== intent.category) {
        return false;
      }

      // Min score filter
      if (intent.minScore && intelligence.compositeScore < intent.minScore) {
        return false;
      }

      // Max days filter
      if (intent.maxDays && market.endDate) {
        const daysUntil = (new Date(market.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysUntil > intent.maxDays) return false;
      }

      // Min liquidity filter
      if (intent.minLiquidity && market.liquidity < intent.minLiquidity) {
        return false;
      }

      // Intent-specific filters
      switch (intent.type) {
        case 'mispricing':
          return intelligence.mispricingScore >= (intent.minScore || 50);
        case 'volume_anomaly':
          return intelligence.volumeAnomalyScore >= (intent.minScore || 50);
        case 'liquidity':
          return intelligence.liquidityEfficiency >= (intent.minScore || 60);
        case 'time_sensitive':
          return intelligence.timeUrgency >= (intent.minScore || 60);
        case 'sentiment_divergence':
          return intelligence.sentimentDivergence >= (intent.minScore || 50);
        default:
          return true;
      }
    });
  }

  private rankResults(
    results: SearchResult[],
    intent: SearchIntent
  ): SearchResult[] {
    // Calculate relevance score for each result
    const scored = results.map(result => {
      let relevanceScore = result.intelligence.compositeScore;

      // Boost based on intent match
      switch (intent.type) {
        case 'mispricing':
          relevanceScore += result.intelligence.mispricingScore * 0.3;
          break;
        case 'volume_anomaly':
          relevanceScore += result.intelligence.volumeAnomalyScore * 0.3;
          break;
        case 'liquidity':
          relevanceScore += result.intelligence.liquidityEfficiency * 0.3;
          break;
        case 'time_sensitive':
          relevanceScore += result.intelligence.timeUrgency * 0.3;
          break;
        case 'sentiment_divergence':
          relevanceScore += result.intelligence.sentimentDivergence * 0.3;
          break;
      }

      // Boost for news alerts
      if (result.synthesis.news.breakingAlert) {
        relevanceScore += 15;
      }

      // Boost for watchtower validation
      if (result.synthesis.watchtower.validationStatus === 'verified') {
        relevanceScore += 10;
      }

      return {
        ...result,
        relevanceScore: Math.min(100, relevanceScore)
      };
    });

    // Sort by relevance
    return scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private generateMatchReasons(result: SearchResult, intent: SearchIntent): string[] {
    const reasons: string[] = [];
    const { intelligence, synthesis } = result;

    // Mispricing reasons
    if (intelligence.mispricingScore >= 70) {
      reasons.push(`🔥 High mispricing detected (score: ${intelligence.mispricingScore})`);
    } else if (intelligence.mispricingScore >= 55) {
      reasons.push(`📊 Moderate mispricing opportunity (${intelligence.mispricingScore})`);
    }

    // Volume reasons
    if (intelligence.volumeAnomalyScore >= 70) {
      reasons.push(`⚡ Volume spike detected (${intelligence.volumeAnomalyScore})`);
    }

    // Sentiment divergence
    if (intelligence.sentimentDivergence >= 60) {
      const direction = synthesis.news.sentiment === 'bullish' ? 'bullish' : 'bearish';
      reasons.push(`📰 News sentiment ${direction} vs market price (${intelligence.sentimentDivergence})`);
    }

    // Time urgency
    if (intelligence.timeUrgency >= 80) {
      const days = Math.ceil((new Date(result.market.endDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      reasons.push(`⏰ Closing in ${days} day${days === 1 ? '' : 's'} (${intelligence.timeUrgency})`);
    }

    // Liquidity
    if (intelligence.liquidityEfficiency >= 80) {
      reasons.push(`💧 High liquidity (${Math.round(result.market.liquidity / 1000000)}M)`);
    }

    // Watchtower validation
    if (synthesis.watchtower.validationStatus === 'verified') {
      reasons.push(`✅ Verified by Watchtower`);
    }

    // Breaking news
    if (synthesis.news.breakingAlert) {
      reasons.push(`🚨 Breaking news detected`);
    }

    // Rating
    reasons.push(`Rating: ${intelligence.opportunityRating}`);

    return reasons;
  }

  private async calculateSentimentDivergence(
    market: PolymarketMarket,
    news: { sentiment: 'bullish' | 'bearish' | 'neutral'; sentimentStrength: number }
  ): Promise<number> {
    // Convert sentiment to implied probability
    let newsImpliedProb = 0.5;
    if (news.sentiment === 'bullish') {
      newsImpliedProb = 0.5 + (news.sentimentStrength / 200);
    } else if (news.sentiment === 'bearish') {
      newsImpliedProb = 0.5 - (news.sentimentStrength / 200);
    }

    // Calculate divergence from market price
    const marketProb = market.yesPrice;
    const divergence = Math.abs(newsImpliedProb - marketProb);

    // Scale to 0-100
    return Math.min(100, divergence * 200);
  }

  private recalculateComposite(intelligence: MarketIntelligence): number {
    return Math.round(
      (intelligence.mispricingScore * 0.30) +
      (intelligence.volumeAnomalyScore * 0.20) +
      (intelligence.liquidityEfficiency * 0.15) +
      (intelligence.sentimentDivergence * 0.20) +
      (intelligence.timeUrgency * 0.15)
    );
  }

  // Utility: Get all markets with intelligence (for War Room feed)
  async getAllIntelligence(): Promise<SearchResult[]> {
    return this.search('', { includeSynthesis: false, limit: 50 });
  }

  // Utility: Get opportunities by type
  async getOpportunities(type: 'mispricing' | 'volume' | 'time' | 'all' = 'all'): Promise<SearchResult[]> {
    const queries: Record<string, string> = {
      mispricing: 'mispriced undervalued',
      volume: 'volume spike activity',
      time: 'closing soon urgent',
      all: ''
    };
    return this.search(queries[type], { limit: 20 });
  }
}

// Singleton instance
let engine: PolymarketSearchEngine | null = null;

export function getSearchEngine(): PolymarketSearchEngine {
  if (!engine) {
    engine = new PolymarketSearchEngine();
  }
  return engine;
}

export function resetSearchEngine(): void {
  engine = null;
}
