// Search Intent Parser - Natural Language → Structured Queries

import type { SearchIntent, SearchIntentType, CategoryType } from './types';
import { CATEGORY_KEYWORDS } from './types';

// Intent keywords mapping
const INTENT_KEYWORDS: Record<SearchIntentType, string[]> = {
  mispricing: [
    'undervalued', 'overvalued', 'mispriced', 'cheap', 'expensive',
    'bargain', 'deal', 'value', 'discount', 'edge', 'advantage',
    'inefficient', 'wrong price', 'out of line', 'discrepancy',
    'arbitrage', 'arb', 'ev+', '+ev', 'positive ev'
  ],
  volume_anomaly: [
    'volume', 'spike', 'surge', 'activity', 'trading',
    'hot', 'trending', 'popular', 'active', 'busy',
    'whale', 'large trade', 'big money', 'institutional',
    'momentum', 'breakout', 'unusual activity'
  ],
  liquidity: [
    'liquid', 'liquidity', 'spread', 'tight spread',
    'easy to trade', 'slippage', 'depth', 'order book',
    'high volume', 'efficient', 'low cost'
  ],
  time_sensitive: [
    'urgent', 'closing soon', 'expires', 'deadline',
    'end soon', 'last chance', 'final', 'resolve soon',
    'this week', 'tomorrow', 'imminent', 'time sensitive'
  ],
  sentiment_divergence: [
    'sentiment', 'news', 'divergence', 'disagreement',
    'contrarian', 'contrary', 'against', 'vs',
    'market vs news', 'information', 'insider'
  ],
  composite: ['best', 'top', 'good', 'great', 'opportunity'],
  all: ['all', 'every', 'any', 'show all', 'list']
};

// Synonym expansion
const SYNONYMS: Record<string, string[]> = {
  'undervalued': ['cheap', 'bargain', 'mispriced', 'inefficient'],
  'overvalued': ['expensive', 'rich', 'overpriced'],
  'crypto': ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto'],
  'ai': ['openai', 'chatgpt', 'claude', 'nvidia', 'artificial intelligence'],
  'fed': ['federal reserve', 'fomc', 'powell', 'interest rate'],
  'volume': ['activity', 'trading', 'turnover'],
  'urgent': ['closing soon', 'time sensitive', 'imminent']
};

// Timeframe keywords
const TIMEFRAME_KEYWORDS: Record<string, string[]> = {
  '1h': ['1 hour', '1h', 'hour', 'recently'],
  '24h': ['24 hour', '24h', 'day', 'today', 'daily'],
  '7d': ['7 day', '7d', 'week', 'weekly'],
  '30d': ['30 day', '30d', 'month', 'monthly']
};

export class IntentParser {
  
  parse(query: string): SearchIntent {
    const normalized = this.normalize(query);
    const tokens = this.tokenize(normalized);
    
    // 1. Determine intent type
    const intentType = this.classifyIntent(tokens, normalized);
    
    // 2. Extract category
    const category = this.extractCategory(tokens, normalized);
    
    // 3. Extract keywords
    const keywords = this.extractKeywords(tokens);
    
    // 4. Extract numeric thresholds
    const { minScore, minLiquidity, maxDays } = this.extractThresholds(tokens, normalized);
    
    // 5. Extract timeframe
    const timeframe = this.extractTimeframe(normalized);
    
    // 6. Calculate confidence
    const confidence = this.calculateConfidence(intentType, category, tokens);
    
    return {
      type: intentType,
      confidence,
      keywords: keywords.length > 0 ? keywords : undefined,
      category,
      minScore,
      maxDays,
      minLiquidity,
      timeframe,
      rawQuery: query,
    };
  }

  private normalize(query: string): string {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Remove punctuation
      .replace(/\s+/g, ' ')       // Normalize whitespace
      .trim();
  }

  private tokenize(text: string): string[] {
    return text.split(' ').filter(t => t.length > 0);
  }

  private classifyIntent(tokens: string[], fullText: string): SearchIntentType {
    const scores: Record<SearchIntentType, number> = {
      mispricing: 0,
      volume_anomaly: 0,
      liquidity: 0,
      time_sensitive: 0,
      sentiment_divergence: 0,
      composite: 0,
      all: 0,
    };

    // Score each intent type
    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      for (const keyword of keywords) {
        if (fullText.includes(keyword)) {
          scores[intent as SearchIntentType] += keyword.split(' ').length;
        }
      }
    }

    // Check for composite indicators
    if (scores.mispricing > 0 && scores.volume_anomaly > 0) {
      return 'composite';
    }

    // Find highest scoring intent
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [topIntent, topScore] = sorted[0];
    
    if (topScore === 0) {
      // No clear intent - check for category-only query
      if (this.extractCategory(tokens, fullText)) {
        return 'all';
      }
      return 'composite'; // Default
    }

    return topIntent as SearchIntentType;
  }

  private extractCategory(tokens: string[], fullText: string): CategoryType | undefined {
    const categoryScores: Record<string, number> = {};

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      categoryScores[category] = 0;
      
      for (const keyword of keywords) {
        const keywordLower = keyword.toLowerCase();
        
        // Exact match
        if (fullText.includes(keywordLower)) {
          categoryScores[category] += keyword.split(' ').length * 2;
        }
        
        // Check tokens
        for (const token of tokens) {
          if (token === keywordLower || keywordLower.includes(token)) {
            categoryScores[category] += 1;
          }
        }
      }
    }

    // Find best matching category
    const sorted = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]);
    const [topCategory, topScore] = sorted[0];
    
    return topScore > 0 ? topCategory as CategoryType : undefined;
  }

  private extractKeywords(tokens: string[]): string[] {
    // Remove common stop words
    const stopWords = new Set(['a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'and', 'or', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'show', 'me', 'find', 'get', 'any', 'all', 'some', 'market', 'markets', 'bet', 'bets']);
    
    // Extract meaningful keywords
    const keywords = tokens
      .filter(t => !stopWords.has(t) && t.length > 2)
      .map(t => this.expandSynonyms(t))
      .flat()
      .filter((v, i, a) => a.indexOf(v) === i); // Unique
    
    return keywords;
  }

  private expandSynonyms(token: string): string[] {
    for (const [base, synonyms] of Object.entries(SYNONYMS)) {
      if (token === base || synonyms.includes(token)) {
        return [base, ...synonyms];
      }
    }
    return [token];
  }

  private extractThresholds(
    tokens: string[],
    fullText: string
  ): { minScore?: number; minLiquidity?: number; maxDays?: number } {
    const result: { minScore?: number; minLiquidity?: number; maxDays?: number } = {};

    // Score thresholds
    const scoreMatch = fullText.match(/(score|rating)\s*(above|over|>|greater than)\s*(\d+)/);
    if (scoreMatch) {
      result.minScore = parseInt(scoreMatch[3], 10);
    }
    
    // Score keywords
    if (fullText.includes('high score') || fullText.includes('good score')) {
      result.minScore = result.minScore || 70;
    }
    if (fullText.includes('top') || fullText.includes('best')) {
      result.minScore = result.minScore || 80;
    }

    // Liquidity thresholds
    const liquidityMatch = fullText.match(/(liquidity|volume)\s*(above|over|>|greater than)\s*[$]?([\d,.]+)\s*(k|m|million)?/i);
    if (liquidityMatch) {
      let value = parseFloat(liquidityMatch[3].replace(/,/g, ''));
      const unit = liquidityMatch[4]?.toLowerCase();
      if (unit === 'k') value *= 1000;
      if (unit === 'm' || unit === 'million') value *= 1000000;
      result.minLiquidity = value;
    }
    
    // High liquidity shorthand
    if (fullText.includes('high liquidity') || fullText.includes('liquid')) {
      result.minLiquidity = result.minLiquidity || 1000000;
    }

    // Time thresholds
    const daysMatch = fullText.match(/(close|end|resolve)\s*(in|within)?\s*(\d+)\s*(day|days|week|weeks|month|months)/);
    if (daysMatch) {
      let days = parseInt(daysMatch[3], 10);
      const unit = daysMatch[4].toLowerCase();
      if (unit.startsWith('week')) days *= 7;
      if (unit.startsWith('month')) days *= 30;
      result.maxDays = days;
    }
    
    // Time keywords
    if (fullText.includes('this week')) result.maxDays = result.maxDays || 7;
    if (fullText.includes('this month')) result.maxDays = result.maxDays || 30;
    if (fullText.includes('soon')) result.maxDays = result.maxDays || 14;

    return result;
  }

  private extractTimeframe(fullText: string): SearchIntent['timeframe'] {
    for (const [timeframe, keywords] of Object.entries(TIMEFRAME_KEYWORDS)) {
      for (const keyword of keywords) {
        if (fullText.includes(keyword)) {
          return timeframe as SearchIntent['timeframe'];
        }
      }
    }
    return undefined;
  }

  private calculateConfidence(
    intentType: SearchIntentType,
    category: CategoryType | undefined,
    tokens: string[]
  ): number {
    let confidence = 50;

    // Higher confidence if we identified an intent
    if (intentType !== 'composite' && intentType !== 'all') {
      confidence += 20;
    }

    // Higher confidence if we identified a category
    if (category) {
      confidence += 20;
    }

    // Longer queries with more context = higher confidence
    if (tokens.length > 3) confidence += 10;
    if (tokens.length > 5) confidence += 10;

    return Math.min(100, confidence);
  }

  // Utility: Generate human-readable explanation
  explainIntent(intent: SearchIntent): string {
    const parts: string[] = [];
    
    if (intent.category) {
      parts.push(`${intent.category} markets`);
    } else {
      parts.push('markets');
    }
    
    switch (intent.type) {
      case 'mispricing':
        parts.push('with mispricing opportunities');
        break;
      case 'volume_anomaly':
        parts.push('showing unusual volume activity');
        break;
      case 'liquidity':
        parts.push('with high liquidity');
        break;
      case 'time_sensitive':
        parts.push('closing soon');
        break;
      case 'sentiment_divergence':
        parts.push('with news sentiment divergence');
        break;
      case 'composite':
        parts.push('with best overall opportunities');
        break;
    }
    
    if (intent.minScore) {
      parts.push(`(score above ${intent.minScore})`);
    }
    
    if (intent.maxDays) {
      parts.push(`(closing within ${intent.maxDays} days)`);
    }
    
    return `Searching for ${parts.join(' ')}`;
  }
}

// Singleton instance
let parser: IntentParser | null = null;

export function getIntentParser(): IntentParser {
  if (!parser) {
    parser = new IntentParser();
  }
  return parser;
}
