// Polymarket Intelligence Engine - Public API

// Types
export type {
  PolymarketMarket,
  MarketIntelligence,
  SearchIntent,
  SearchIntentType,
  CategoryType,
  SearchResult,
  NewsCorrelation,
  NewsArticle,
  WatchtowerValidation,
  WatchtowerAlert,
  RelatedEvent,
  KnowledgeGraph,
  CacheStats,
  APIHealthMetrics,
} from './types';

export { CATEGORY_KEYWORDS, EXCLUDED_TERMS, DEFAULT_CONFIG } from './types';

// Core engines
export { PolymarketSearchEngine, getSearchEngine, resetSearchEngine } from './search-engine';
export { IntentParser, getIntentParser } from './intent-parser';
export { StatisticalEngine, getStatisticalEngine } from './statistical-engine';
export { SynthesisEngine, getSynthesisEngine } from './synthesis';

// Infrastructure
export { TieredCache, getGlobalCache, clearGlobalCache } from './cache';
export { 
  RetryManager, 
  CircuitBreaker, 
  ResilientExecutor,
  RetryExhaustedError,
  CircuitBreakerOpenError 
} from './retry';
export { 
  PolymarketIntelligenceClient, 
  getPolymarketClient, 
  resetPolymarketClient,
  FALLBACK_MARKETS 
} from './client';

// Convenience: Quick search function
import { getSearchEngine } from './search-engine';

export async function searchPolymarket(query: string, limit = 20) {
  const engine = getSearchEngine();
  return engine.search(query, { limit });
}

export async function getMarketOpportunities(type: 'mispricing' | 'volume' | 'time' | 'all' = 'all') {
  const engine = getSearchEngine();
  return engine.getOpportunities(type);
}
