// Multi-Field Synthesis Engine - News + Watchtower + Knowledge Graph

import type { 
  PolymarketMarket, 
  NewsCorrelation, 
  NewsArticle,
  WatchtowerValidation, 
  WatchtowerAlert,
  RelatedEvent,
  KnowledgeGraph 
} from './types';

// Use existing harvest endpoint
const HARVEST_ENDPOINT = '/api/intelligence/harvest';

export class SynthesisEngine {
  
  // ============================================================================
  // News Feed Correlation (using existing NewsAPI integration)
  // ============================================================================
  async correlateNews(market: PolymarketMarket): Promise<NewsCorrelation> {
    try {
      // Build query from market title and category
      const query = this.buildNewsQuery(market);
      
      // Call existing harvest endpoint
      const response = await fetch(HARVEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          sources: ['newsapi'],
          maxResults: 10,
          days: 7
        })
      });

      if (!response.ok) {
        throw new Error(`Harvest API error: ${response.status}`);
      }

      const data = await response.json();
      const articles: NewsArticle[] = this.parseNewsArticles(data.articles || []);
      
      // Analyze sentiment
      const sentiment = this.analyzeSentiment(articles);
      
      // Calculate divergence between news sentiment and market price
      const divergence = this.calculateDivergence(sentiment, market.yesPrice);
      
      // Check for breaking news
      const breakingAlert = this.detectBreakingNews(articles);
      
      return {
        articles: articles.slice(0, 5),
        sentiment: sentiment.direction,
        sentimentStrength: sentiment.strength,
        divergence,
        breakingAlert
      };

    } catch (error) {
      console.warn('[Synthesis] News correlation failed:', error);
      return {
        articles: [],
        sentiment: 'neutral',
        sentimentStrength: 50,
        divergence: 0,
        breakingAlert: false
      };
    }
  }

  private buildNewsQuery(market: PolymarketMarket): string {
    // Extract key terms from market title
    const title = market.title.toLowerCase();
    
    // Remove common words
    const stopWords = ['will', 'the', 'a', 'an', 'in', 'on', 'at', 'by', 'to', 'for', 'of', 'and', 'or', 'be', 'is', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'would', 'should', 'may', 'might', 'must'];
    
    const terms = title
      .split(/\s+/)
      .filter(word => !stopWords.includes(word) && word.length > 2)
      .slice(0, 5); // Top 5 terms
    
    return terms.join(' OR ');
  }

  private parseNewsArticles(data: any[]): NewsArticle[] {
    return data.map(article => ({
      title: article.title || 'Untitled',
      description: article.description,
      url: article.url || '#',
      publishedAt: article.publishedAt || article.published_at || new Date().toISOString(),
      source: article.source?.name || article.source || 'Unknown',
      relevance: this.calculateRelevance(article)
    }));
  }

  private calculateRelevance(article: any): number {
    // Simple relevance scoring
    let score = 50;
    
    // Higher score for recent articles
    const age = Date.now() - new Date(article.publishedAt || Date.now()).getTime();
    const daysOld = age / (1000 * 60 * 60 * 24);
    if (daysOld < 1) score += 20;
    else if (daysOld < 3) score += 10;
    
    // Higher score for articles with descriptions
    if (article.description && article.description.length > 100) score += 10;
    
    return Math.min(100, score);
  }

  private analyzeSentiment(articles: NewsArticle[]): { direction: 'bullish' | 'bearish' | 'neutral'; strength: number } {
    if (articles.length === 0) {
      return { direction: 'neutral', strength: 50 };
    }

    // Simple keyword-based sentiment
    const bullishWords = ['surge', 'rally', 'gain', 'rise', 'bullish', 'optimistic', 'positive', 'strong', 'growth', 'boom', 'breakthrough', 'success', 'win', 'agreement', 'deal'];
    const bearishWords = ['fall', 'drop', 'decline', 'bearish', 'pessimistic', 'negative', 'weak', 'crash', 'crisis', 'failure', 'loss', 'conflict', 'war', 'disaster', 'concern', 'worry'];
    
    let bullishCount = 0;
    let bearishCount = 0;
    
    for (const article of articles) {
      const text = `${article.title} ${article.description || ''}`.toLowerCase();
      
      for (const word of bullishWords) {
        if (text.includes(word)) bullishCount++;
      }
      for (const word of bearishWords) {
        if (text.includes(word)) bearishCount++;
      }
    }
    
    const total = bullishCount + bearishCount;
    if (total === 0) {
      return { direction: 'neutral', strength: 50 };
    }
    
    const bullishRatio = bullishCount / total;
    const bearishRatio = bearishCount / total;
    
    // Direction
    let direction: 'bullish' | 'bearish' | 'neutral';
    if (bullishRatio > 0.6) direction = 'bullish';
    else if (bearishRatio > 0.6) direction = 'bearish';
    else direction = 'neutral';
    
    // Strength based on volume of sentiment words
    const strength = Math.min(100, 40 + (total * 5));
    
    return { direction, strength };
  }

  private calculateDivergence(
    sentiment: { direction: 'bullish' | 'bearish' | 'neutral'; strength: number },
    marketPrice: number
  ): number {
    // Convert sentiment to implied probability
    let newsImpliedProb = 0.5;
    if (sentiment.direction === 'bullish') newsImpliedProb = 0.5 + (sentiment.strength / 200);
    if (sentiment.direction === 'bearish') newsImpliedProb = 0.5 - (sentiment.strength / 200);
    
    // Calculate divergence
    const divergence = Math.abs(newsImpliedProb - marketPrice);
    return divergence;
  }

  private detectBreakingNews(articles: NewsArticle[]): boolean {
    const now = Date.now();
    
    for (const article of articles) {
      const age = now - new Date(article.publishedAt).getTime();
      const hoursOld = age / (1000 * 60 * 60);
      
      // Articles less than 6 hours old with high relevance
      if (hoursOld < 6 && article.relevance > 70) {
        const title = article.title.toLowerCase();
        const breakingIndicators = ['breaking', 'urgent', 'just', 'developing', 'alert', 'exclusive'];
        if (breakingIndicators.some(w => title.includes(w))) {
          return true;
        }
      }
    }
    
    return false;
  }

  // ============================================================================
  // Watchtower Validation (Ground Truth)
  // ============================================================================
  async validateWithWatchtower(market: PolymarketMarket): Promise<WatchtowerValidation> {
    try {
      // Extract keywords for watchtower search
      const keywords = this.extractKeywords(market.title);
      
      // Call harvest endpoint for watchtower data
      const response = await fetch(HARVEST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: keywords.join(' '),
          sources: ['watchtower'],
          regions: this.inferRegion(market),
          maxResults: 10,
          days: 30
        })
      });

      if (!response.ok) {
        throw new Error(`Harvest API error: ${response.status}`);
      }

      const data = await response.json();
      const alerts: WatchtowerAlert[] = this.parseWatchtowerAlerts(data.watchtower || data.alerts || []);
      
      // Calculate validation scores
      const factualMatch = this.calculateFactualMatch(market, alerts);
      const trustScore = this.calculateTrustScore(alerts);
      const validationStatus = this.determineValidationStatus(alerts, factualMatch);
      
      return {
        relatedAlerts: alerts,
        factualMatch,
        trustScore,
        validationStatus
      };

    } catch (error) {
      console.warn('[Synthesis] Watchtower validation failed:', error);
      return {
        relatedAlerts: [],
        factualMatch: 0,
        trustScore: 0,
        validationStatus: 'unverified'
      };
    }
  }

  private extractKeywords(title: string): string[] {
    const stopWords = new Set(['will', 'the', 'a', 'an', 'in', 'on', 'at', 'by', 'to', 'for', 'of', 'and', 'or', 'be', 'is', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could', 'would', 'should']);
    
    return title
      .toLowerCase()
      .split(/\s+/)
      .filter(word => !stopWords.has(word) && word.length > 2)
      .slice(0, 4);
  }

  private inferRegion(market: PolymarketMarket): string[] {
    const title = market.title.toLowerCase();
    const regions: string[] = [];
    
    if (title.includes('ukraine') || title.includes('russia')) regions.push('europe', 'ukraine', 'russia');
    if (title.includes('israel') || title.includes('gaza') || title.includes('iran')) regions.push('middle-east', 'israel');
    if (title.includes('china') || title.includes('taiwan')) regions.push('asia', 'china');
    if (title.includes('fed') || title.includes('us') || title.includes('america')) regions.push('north-america', 'usa');
    if (title.includes('eu') || title.includes('europe')) regions.push('europe');
    
    if (regions.length === 0) regions.push('global');
    return regions;
  }

  private parseWatchtowerAlerts(data: any[]): WatchtowerAlert[] {
    return data.map(alert => ({
      id: alert.id || String(Math.random()),
      title: alert.title || 'Untitled Alert',
      description: alert.description || alert.summary || '',
      region: alert.region || 'global',
      severity: this.mapSeverity(alert.severity),
      timestamp: alert.timestamp || alert.publishedAt || new Date().toISOString(),
      source: alert.source || 'Watchtower'
    }));
  }

  private mapSeverity(severity: string): 'high' | 'medium' | 'low' {
    const s = severity?.toLowerCase() || '';
    if (s.includes('high') || s.includes('critical') || s.includes('severe')) return 'high';
    if (s.includes('medium') || s.includes('moderate')) return 'medium';
    return 'low';
  }

  private calculateFactualMatch(market: PolymarketMarket, alerts: WatchtowerAlert[]): number {
    if (alerts.length === 0) return 0;
    
    // Calculate overlap between market keywords and alert keywords
    const marketText = market.title.toLowerCase();
    let matchScore = 0;
    
    for (const alert of alerts) {
      const alertText = `${alert.title} ${alert.description}`.toLowerCase();
      
      // Count matching keywords
      const marketWords = marketText.split(/\s+/);
      const matches = marketWords.filter(word => 
        word.length > 3 && alertText.includes(word)
      ).length;
      
      matchScore += Math.min(25, matches * 5);
    }
    
    return Math.min(100, matchScore);
  }

  private calculateTrustScore(alerts: WatchtowerAlert[]): number {
    if (alerts.length === 0) return 0;
    
    // More alerts = higher confidence
    const quantityScore = Math.min(50, alerts.length * 10);
    
    // Higher severity = higher trust
    const severityScore = alerts.reduce((sum, a) => {
      return sum + (a.severity === 'high' ? 20 : a.severity === 'medium' ? 10 : 5);
    }, 0);
    
    return Math.min(100, quantityScore + Math.min(50, severityScore));
  }

  private determineValidationStatus(
    alerts: WatchtowerAlert[],
    factualMatch: number
  ): 'verified' | 'partial' | 'unverified' | 'disputed' {
    if (alerts.length === 0) return 'unverified';
    if (factualMatch > 70) return 'verified';
    if (factualMatch > 40) return 'partial';
    
    // Check for conflicting alerts
    const highSeverityCount = alerts.filter(a => a.severity === 'high').length;
    if (highSeverityCount > 0 && factualMatch < 30) return 'disputed';
    
    return 'unverified';
  }

  // ============================================================================
  // Knowledge Graph - Event Linking
  // ============================================================================
  buildKnowledgeGraph(markets: PolymarketMarket[]): KnowledgeGraph {
    // Extract entities and concepts from each market
    const nodes = markets.map(market => ({
      id: market.id,
      title: market.title,
      category: market.category,
      probability: market.yesPrice,
      endDate: market.endDate,
      entities: this.extractEntities(market.title),
      concepts: this.extractConcepts(market.title, market.category)
    }));

    // Find relationships
    const relationships: KnowledgeGraph['relationships'] = [];
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        
        // Skip if same node
        if (a.id === b.id) continue;
        
        // Check for entity overlap
        const sharedEntities = a.entities.filter(e => b.entities.includes(e));
        if (sharedEntities.length > 0) {
          relationships.push({
            source: a.id,
            target: b.id,
            type: 'correlates',
            strength: Math.min(100, sharedEntities.length * 25 + 30)
          });
        }
        
        // Check for concept overlap
        const sharedConcepts = a.concepts.filter(c => b.concepts.includes(c));
        if (sharedConcepts.length > 0 && sharedEntities.length === 0) {
          relationships.push({
            source: a.id,
            target: b.id,
            type: 'influences',
            strength: Math.min(100, sharedConcepts.length * 20 + 20)
          });
        }
        
        // Check for temporal relationship
        if (a.endDate && b.endDate) {
          const aDate = new Date(a.endDate).getTime();
          const bDate = new Date(b.endDate).getTime();
          const diffDays = Math.abs(aDate - bDate) / (1000 * 60 * 60 * 24);
          
          if (diffDays < 7 && sharedEntities.length === 0 && sharedConcepts.length === 0) {
            relationships.push({
              source: aDate < bDate ? a.id : b.id,
              target: aDate < bDate ? b.id : a.id,
              type: 'precedes',
              strength: Math.max(30, 70 - diffDays * 5)
            });
          }
        }
      }
    }

    return { events: nodes, relationships };
  }

  findRelatedEvents(marketId: string, graph: KnowledgeGraph, maxResults: number = 5): RelatedEvent[] {
    const relationships = graph.relationships
      .filter(r => r.source === marketId || r.target === marketId)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, maxResults);
    
    return relationships.map(r => {
      const relatedId = r.source === marketId ? r.target : r.source;
      const relatedEvent = graph.events.find(e => e.id === relatedId);
      
      return {
        market: relatedEvent,
        relationType: r.type,
        strength: r.strength,
        sharedEntities: [], // Could be populated from original extraction
        sharedConcepts: []
      };
    }).filter(r => r.market !== undefined);
  }

  private extractEntities(title: string): string[] {
    const entities: string[] = [];
    const text = title.toLowerCase();
    
    // Geopolitical entities
    if (text.includes('ukraine')) entities.push('ukraine');
    if (text.includes('russia') || text.includes('putin')) entities.push('russia');
    if (text.includes('israel')) entities.push('israel');
    if (text.includes('gaza') || text.includes('hamas')) entities.push('gaza', 'hamas');
    if (text.includes('iran')) entities.push('iran');
    if (text.includes('china')) entities.push('china');
    if (text.includes('taiwan')) entities.push('taiwan');
    
    // Organizations
    if (text.includes('fed') || text.includes('federal reserve')) entities.push('fed');
    if (text.includes('sec')) entities.push('sec');
    if (text.includes('fda')) entities.push('fda');
    if (text.includes('opec')) entities.push('opec');
    if (text.includes('openai')) entities.push('openai');
    
    // People
    if (text.includes('powell')) entities.push('powell');
    if (text.includes('putin')) entities.push('putin');
    if (text.includes('zelensky')) entities.push('zelensky');
    
    // Assets
    if (text.includes('bitcoin') || text.includes('btc')) entities.push('bitcoin');
    if (text.includes('ethereum') || text.includes('eth')) entities.push('ethereum');
    if (text.includes('oil')) entities.push('oil');
    if (text.includes('gold')) entities.push('gold');
    
    return [...new Set(entities)];
  }

  private extractConcepts(title: string, category?: string): string[] {
    const concepts: string[] = [];
    const text = title.toLowerCase();
    
    // From category
    if (category) concepts.push(category.toLowerCase());
    
    // From keywords
    if (text.includes('war') || text.includes('conflict')) concepts.push('conflict');
    if (text.includes('election')) concepts.push('election');
    if (text.includes('approval')) concepts.push('regulatory');
    if (text.includes('rate') || text.includes('inflation')) concepts.push('monetary_policy');
    if (text.includes('etf')) concepts.push('etf');
    if (text.includes('ceasefire') || text.includes('peace')) concepts.push('diplomacy');
    if (text.includes('invasion') || text.includes('attack')) concepts.push('military_action');
    
    return [...new Set(concepts)];
  }
}

// Singleton instance
let synthesis: SynthesisEngine | null = null;

export function getSynthesisEngine(): SynthesisEngine {
  if (!synthesis) {
    synthesis = new SynthesisEngine();
  }
  return synthesis;
}
