/**
 * Polymarket Type Definitions
 * Gamma API + CLOB API unified types
 */

// ============================================
// Gamma API Types (Market Metadata)
// ============================================

export interface GammaMarket {
  id: string;
  conditionId: string;
  question: string;
  slug: string;
  description?: string;
  category: string;
  endDate: string;
  active: boolean;
  closed: boolean;
  volume: number;
  liquidity: number;
  outcomes: string[];
  outcomePrices: string; // JSON string of prices
  image?: string;
  icon?: string;
  tags?: Array<{ id: string; label: string; slug: string }>;
  createdAt?: string;
  resolutionSource?: string;
}

export interface GammaEvent {
  id: string;
  title: string;
  slug: string;
  description?: string;
  category?: string;
  endDate?: string;
  active: boolean;
  closed: boolean;
  volume: number;
  liquidity: number;
  markets: GammaMarket[];
  tags?: Array<{ id: string; label: string; slug: string }>;
  image?: string;
}

// ============================================
// CLOB API Types (Prices & Order Book)
// ============================================

export interface ClobMarket {
  conditionId: string;
  question: string;
  description?: string;
  active: boolean;
  closed: boolean;
  marketType: string;
  tokens: ClobToken[];
}

export interface ClobToken {
  tokenId: string;
  outcome: string;
  price: number;
  winner?: boolean;
}

export interface OrderBookLevel {
  price: string;
  size: string;
}

export interface OrderBook {
  market: string;
  assetId: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: string;
}

export interface ClobPrice {
  conditionId: string;
  assetId: string;
  outcome: string;
  price: number;
  bestBid?: number;
  bestAsk?: number;
  lastTradePrice?: number;
  timestamp: string;
}

export interface BatchPriceResponse {
  [conditionId: string]: {
    [outcome: string]: string; // price as string
  };
}

// ============================================
// WebSocket Types
// ============================================

export interface WebSocketMessage {
  type: 'price' | 'trade' | 'book' | 'subscription' | 'error';
  data: unknown;
}

export interface PriceUpdateMessage {
  type: 'price';
  data: {
    conditionId: string;
    assetId: string;
    outcome: string;
    price: number;
    side: 'buy' | 'sell';
    size?: string;
    timestamp: string;
  };
}

export interface TradeMessage {
  type: 'trade';
  data: {
    conditionId: string;
    assetId: string;
    outcome: string;
    price: number;
    size: string;
    side: 'buy' | 'sell';
    timestamp: string;
  };
}

export interface SubscriptionMessage {
  type: 'subscription';
  data: {
    conditionId: string;
    status: 'subscribed' | 'unsubscribed';
  };
}

// ============================================
// Enriched Types (Gamma + CLOB Combined)
// ============================================

export interface EnrichedMarket extends GammaMarket {
  // CLOB Price Data
  bestBid: number | null;
  bestAsk: number | null;
  lastTradePrice: number | null;
  spread: number | null;
  midPrice: number | null;
  
  // Order Book (optional, for detailed views)
  orderBook?: {
    bids: OrderBookLevel[];
    asks: OrderBookLevel[];
    timestamp: string;
  };
  
  // Metadata
  priceSource: 'clob' | 'gamma' | 'cached';
  lastUpdated: string;
}

export interface EnrichedEvent extends GammaEvent {
  markets: EnrichedMarket[];
  priceSource: 'clob' | 'gamma' | 'cached';
  lastUpdated: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  source?: 'clob' | 'gamma' | 'cache';
}

export interface EventsResponse {
  events: EnrichedEvent[];
  total: number;
  categories: string[];
}

export interface MarketDetailResponse {
  market: EnrichedMarket;
  orderBook?: OrderBook;
  recentTrades?: TradeMessage['data'][];
}

// ============================================
// Frontend Hook Types
// ============================================

export interface UsePolymarketReturn {
  markets: EnrichedMarket[];
  events: EnrichedEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

export interface UsePolymarketWebSocketReturn {
  prices: Map<string, ClobPrice>; // key: conditionId_outcome
  connected: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscribe: (conditionId: string) => void;
  unsubscribe: (conditionId: string) => void;
  error: string | null;
}

// ============================================
// Rate Limiting Types
// ============================================

export interface RateLimitState {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per second
}

export interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  priority: number;
}
