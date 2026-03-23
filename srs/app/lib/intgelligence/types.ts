// Polymarket Intelligence Engine - Type Definitions

export interface PolymarketMarket {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  volume24h?: number;
  liquidity: number;
  bestBid?: number;
  bestAsk?: number;
  midPrice?: number;
  category?: string;
  endDate?: string;
  createdAt?: string;
  url?: string;
  icon?: string;
  // For historical analysis
  priceHistory?: { timestamp: number; price: number }[];
  volumeHistory?: { timestamp: number; volume: number }[];
  recentTrades?: Trade[];
}

export interface Trade {
  id: string;
  price: number;
  size: number;
  side: 'buy' | 'sell';
  timestamp: number;
  trader?: string;
}

// Intelligence Scores
export interface MarketIntelligence {
  mispricingScore: number;        // 0-100: Technical indicators (Z-score, Bollinger, RSI)
  volumeAnomalyScore: number;     // 0-100: Volume Z-score + whale detection
  liquidityEfficiency: number;    // 0-100: Spread + depth analysis
  sentimentDivergence: number;    // 0-100: News sentiment vs market price
  timeUrgency: number;            // 0-100: Closing proximity
  
  compositeScore: number;         // 0-100: Weighted average
  opportunityRating: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  primarySignal: 'mispricing' | 'volume_spike' | 'sentiment_divergence' | 'time_urgent' | 'liquidity';
  confidence: number;             // 0-100
}

// Search Intent Types
export type SearchIntentType = 
  | 'mispricing' 
  | 'volume_anomaly' 
  | 'liquidity' 
  | 'time_sensitive' 
  | 'sentiment_divergence'
  | 'composite'
  | 'all';

export interface SearchIntent {
  type: SearchIntentType;
  confidence: number;
  keywords?: string[];
  category?: CategoryType;
  minScore?: number;
  maxDays?: number;
  minLiquidity?: number;
  timeframe?: '1h' | '24h' | '7d' | '30d';
  rawQuery: string;
}

export type CategoryType = 
  | 'AI/Tech' 
  | 'Crypto' 
  | 'Geopolitics' 
  | 'Biotech' 
  | 'Macro' 
  | 'Commodities';

// Synthesis Results
export interface NewsCorrelation {
  articles: NewsArticle[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentStrength: number;  // 0-100
  divergence: number;         // 0-1: Difference between news implied and market price
  breakingAlert: boolean;
}

export interface NewsArticle {
  title: string;
  description?: string;
  url: string;
  publishedAt: string;
  source: string;
  relevance: number;
}

export interface WatchtowerValidation {
  relatedAlerts: WatchtowerAlert[];
  factualMatch: number;       // 0-100
  trustScore: number;         // 0-100
  validationStatus: 'verified' | 'partial' | 'unverified' | 'disputed';
}

export interface WatchtowerAlert {
  id: string;
  title: string;
  description: string;
  region: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
  source: string;
}

export interface RelatedEvent {
  market: MarketNode;
  relationType: 'correlates' | 'influences' | 'precedes' | 'contradicts';
  strength: number;  // 0-100
  sharedEntities?: string[];
  sharedConcepts?: string[];
}

export interface KnowledgeGraph {
  events: MarketNode[];
  relationships: Relationship[];
}

export interface MarketNode {
  id: string;
  title: string;
  category?: string;
  probability: number;
  endDate?: string;
  entities: string[];
  concepts: string[];
}

export interface Relationship {
  source: string;
  target: string;
  type: 'correlates' | 'influences' | 'precedes' | 'contradicts';
  strength: number;
}

// Search Results
export interface SearchResult {
  market: PolymarketMarket;
  intelligence: MarketIntelligence;
  synthesis: {
    news: NewsCorrelation;
    watchtower: WatchtowerValidation;
    related: RelatedEvent[];
  };
  matchReasons: string[];
  relevanceScore: number;
  rank: number;
}

// Cache Types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

// API Health
export interface APIHealthMetrics {
  successRate: number;
  avgResponseTime: number;
  lastError?: string;
  errorCount: number;
  requestCount: number;
  circuitState: 'closed' | 'open' | 'half-open';
}

// Configuration
export interface IntelligenceConfig {
  cacheTTL: {
    memory: number;
    localStorage: number;
  };
  retryAttempts: number;
  retryDelay: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

// Default configuration
export const DEFAULT_CONFIG: IntelligenceConfig = {
  cacheTTL: {
    memory: 30000,      // 30 seconds
    localStorage: 300000, // 5 minutes
  },
  retryAttempts: 5,
  retryDelay: 1000,
  circuitBreakerThreshold: 10,
  circuitBreakerTimeout: 30000,
};

// Category Keywords for Filtering
export const CATEGORY_KEYWORDS: Record<CategoryType, string[]> = {
  'AI/Tech': ['openai', 'chatgpt', 'claude', 'nvidia', 'nvda', 'gpt', 'gpt-4', 'gpt-5', 'llm', 'ai ', 'artificial intelligence', 'machine learning', 'anthropic', 'gemini', 'frontier model'],
  'Crypto': ['bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'etf', 'sec', 'crypto', 'blockchain', 'binance', 'coinbase', 'defi', 'regulatory', 'approval'],
  'Geopolitics': ['ukraine', 'russia', 'putin', 'zelensky', 'israel', 'gaza', 'hamas', 'iran', 'china', 'taiwan', 'war', 'ceasefire', 'sanctions', 'invasion', 'conflict', 'missile', 'strike'],
  'Biotech': ['fda', 'approval', 'drug', 'vaccine', 'clinical trial', 'phase 3', 'pharma', 'biotech', 'alzheimer', 'cancer', 'treatment', 'therapy'],
  'Macro': ['fed', 'federal reserve', 'rate cut', 'rate hike', 'interest rate', 'inflation', 'recession', 'gdp', 'cpi', 'pce', 'unemployment', 'fomc', 'powell'],
  'Commodities': ['oil', 'crude', 'gold', 'silver', 'gas', 'natural gas', 'opec', 'copper', 'lithium', 'commodity', 'supply', 'production']
};

// Excluded Terms (Elections, Sports, Entertainment)
export const EXCLUDED_TERMS = [
  // Elections & Politics
  'trump', 'biden', 'harris', 'desantis', 'newsom', 'pence', 'clinton', 'obama',
  'election', 'elect', 'vote', 'voting', 'ballot', 'primary', 'presidential',
  'senate', 'congressional', 'governor', 'mayor', 'house of representatives',
  'democrat', 'republican', 'gop', 'nomination', 'candidate', 'campaign',
  'polling', 'electorate', 'swing state', 'battleground', 'rally', 'debate',
  // Sports
  'nfl', 'nba', 'mlb', 'nhl', 'super bowl', 'stanley cup', 'world cup', 
  'olympics', 'fifa', 'soccer', 'football', 'basketball', 'baseball', 'hockey',
  'tennis', 'golf', 'masters', 'playoff', 'championship', 'tournament',
  // Entertainment
  'oscar', 'grammy', 'emmy', 'academy award', 'taylor swift', 'beyonce',
  'movie', 'film', 'album', 'song', 'celebrity', 'actor', 'actress',
  // Other
  'weinstein', 'epstein', 'depp', 'heard', 'kardashian', 'gta', 'jesus',
  'messi', 'ronaldo', 'lebron', 'brady'
];
