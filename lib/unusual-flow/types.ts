export interface MarketData {
  id: string;
  question: string;
  category: string;
  currentPrice: number;
  volume24h: number;
  liquidity: number;
  resolutionTime?: string;
  slug: string;
  icon?: string;
}

export interface Trade {
  id: string;
  side: 'YES' | 'NO';
  sizeUsd: number;
  price: number;
  timestamp: number;
}

export interface UnusualFlowSignal {
  id: string;
  timestamp: number;
  marketId: string;
  marketQuestion: string;
  marketSlug: string;
  category: string;
  icon?: string;
  type: 'WHALE_ORDER' | 'VOLUME_SPIKE' | 'EXTREME_PROB' | 'FLOW_IMBALANCE' | 'LATE_MONEY';
  side: 'YES' | 'NO';
  severity: 'NOTABLE' | 'UNUSUAL' | 'SUSPICIOUS' | 'WHALE_ALERT';
  activity: {
    size: number;
    price: number;
    impliedProbability: number;
    marketProbability: number;
    edge: number;
  };
  context: {
    volume24h: number;
    avgTradeSize: number;
    hoursToResolution: number;
    smartMoneyScore: number;
  };
  rationale: string;
  expiresAt: number;
}

export interface FlowApiResponse {
  alerts: UnusualFlowSignal[];
  count: number;
  lastUpdated: number;
  categories: string[];
}

export interface BaselineData {
  hourlyAvg: number;
  hourlyStd: number;
  lastUpdated: number;
}
