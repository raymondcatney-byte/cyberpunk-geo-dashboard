/**
 * DeFi Intelligence APIs
 * Shared frontend adapters over normalized backend routes
 */

import { getTradingSnapshot } from './trading-intel';

// Polymarket API
export type PolymarketEvent = {
  id: string;
  title: string;
  category: string;
  volume: number;
  yesPrice: number;
  noPrice: number;
  endDate: string;
  liquidity: number;
  description?: string;
};

export async function fetchPolymarketEvents(limit = 10): Promise<PolymarketEvent[]> {
  try {
    const snapshot = await getTradingSnapshot();
    return snapshot.polymarket.slice(0, limit).map((market) => ({
      id: market.id,
      title: market.title,
      category: market.category || 'General',
      volume: market.volume,
      yesPrice: market.yesPrice,
      noPrice: market.noPrice,
      endDate: market.endDate || new Date().toISOString(),
      liquidity: market.liquidity,
      description: '',
    }));
  } catch (error) {
    console.error('[Polymarket] Fetch error:', error);
    // Return mock data on error
    return [
      { id: '1', title: 'BTC > $100k by end of 2025', category: 'Crypto', volume: 25000000, yesPrice: 0.45, noPrice: 0.55, endDate: '2025-12-31', liquidity: 5000000 },
      { id: '2', title: 'US Fed cuts rates in Q2 2025', category: 'Finance', volume: 18000000, yesPrice: 0.62, noPrice: 0.38, endDate: '2025-06-30', liquidity: 3500000 },
      { id: '3', title: 'Major conflict escalation in Asia', category: 'Geopolitics', volume: 12000000, yesPrice: 0.28, noPrice: 0.72, endDate: '2025-06-30', liquidity: 2000000 },
    ];
  }
}

// DeFi Llama Yields
export type YieldPool = {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  apy: number;
  tvl: number;
  apyBase?: number;
  apyReward?: number;
};

export async function fetchYieldOpportunities(limit = 10): Promise<YieldPool[]> {
  try {
    const response = await fetch(`/api/defi/yields?limit=${limit}`, {
      headers: { Accept: 'application/json' },
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'YIELDS_FAILED');

    const pools = Array.isArray(payload.yields) ? payload.yields : [];
    return pools.slice(0, limit).map((pool: any) => ({
      pool: pool.id || 'unknown',
      chain: pool.chain || 'Ethereum',
      project: pool.project || 'Unknown',
      symbol: pool.symbol || '???',
      apy: pool.apy || 0,
      tvl: pool.tvl || 0,
      apyBase: pool.apyBase,
      apyReward: pool.apyReward,
    }));
  } catch (error) {
    console.error('[DeFi Llama] Fetch error:', error);
    return [
      { pool: 'curve-usdc-usdt', chain: 'Ethereum', project: 'Curve', symbol: 'USDC-USDT', apy: 8.5, tvl: 450000000 },
      { pool: 'aave-eth', chain: 'Ethereum', project: 'Aave', symbol: 'ETH', apy: 3.2, tvl: 1200000000 },
      { pool: 'uniswap-eth-usdc', chain: 'Arbitrum', project: 'Uniswap', symbol: 'ETH-USDC', apy: 18.7, tvl: 89000000 },
      { pool: 'lido-steth', chain: 'Ethereum', project: 'Lido', symbol: 'stETH', apy: 3.8, tvl: 1500000000 },
    ];
  }
}

// Whale Watching (Etherscan + Mock for demo)
export type WhaleTransaction = {
  id: string;
  from: string;
  to: string;
  value: string;
  token: string;
  timestamp: number;
  hash: string;
  type: 'buy' | 'sell' | 'transfer';
  confidence: 'high' | 'medium' | 'low';
};

export async function fetchWhaleTransactions(limit = 10): Promise<WhaleTransaction[]> {
  try {
    const snapshot = await getTradingSnapshot();
    return snapshot.whales.slice(0, limit).map((trade) => ({
      id: trade.id,
      from: 'watchlist',
      to: trade.dex,
      value: trade.valueFormatted,
      token: trade.tokenSymbol,
      timestamp: trade.timestamp,
      hash: trade.txHash,
      type: (trade.type === 'buy' ? 'buy' : trade.type === 'sell' ? 'sell' : 'transfer') as WhaleTransaction['type'],
      confidence: (trade.value >= 5_000_000 ? 'high' : trade.value >= 2_000_000 ? 'medium' : 'low') as WhaleTransaction['confidence'],
    }));
  } catch {
    const now = Date.now();
    const fallback: WhaleTransaction[] = [
      { id: '1', from: '0x742d...3a91', to: '0x891d...2b45', value: '$12.4M', token: 'USDC', timestamp: now - 120000, hash: '0xabc...def', type: 'transfer', confidence: 'high' },
      { id: '2', from: '0x123d...9f22', to: '0x456e...8e33', value: '$8.7M', token: 'ETH', timestamp: now - 300000, hash: '0xdef...ghi', type: 'sell', confidence: 'high' },
      { id: '3', from: '0x789f...1d44', to: '0xabcf...5c66', value: '$23.1M', token: 'WBTC', timestamp: now - 600000, hash: '0xghi...jkl', type: 'buy', confidence: 'high' },
    ];
    return fallback.slice(0, limit);
  }
}

// Signal Engine Types
export type SignalSource = 
  | 'polymarket'
  | 'whale'
  | 'yield'
  | 'aircraft'
  | 'satellite'
  | 'seismic'
  | 'weather';

export type ConfidenceLevel = 'critical' | 'high' | 'medium' | 'low';

export type Signal = {
  id: string;
  source: SignalSource;
  title: string;
  description: string;
  confidence: ConfidenceLevel;
  timestamp: number;
  data: any;
  recommendation: string;
};

// Correlation engine - generates signals from multiple data sources
export function generateSignals(
  polymarket: PolymarketEvent[],
  whales: WhaleTransaction[],
  yields: YieldPool[],
  aircraft: any[],
  satellites: any[],
  earthquakes: any[]
): Signal[] {
  const signals: Signal[] = [];
  const now = Date.now();

  // Political instability signal
  const geoPoliticalMarkets = polymarket.filter(p => 
    p.category === 'Geopolitics' && p.yesPrice > 0.3
  );
  if (geoPoliticalMarkets.length > 0) {
    signals.push({
      id: 'sig-1',
      source: 'polymarket',
      title: 'Geopolitical Tension Rising',
      description: `Prediction markets showing ${geoPoliticalMarkets.length} elevated conflict probabilities`,
      confidence: geoPoliticalMarkets.length > 2 ? 'high' : 'medium',
      timestamp: now,
      data: geoPoliticalMarkets,
      recommendation: 'Monitor defense sectors, consider hedging long positions',
    });
  }

  // Smart money rotation signal
  const recentWhales = whales.filter(w => w.timestamp > now - 600000);
  const sellPressure = recentWhales.filter(w => w.type === 'sell').length;
  const buyPressure = recentWhales.filter(w => w.type === 'buy').length;
  
  if (sellPressure > buyPressure && sellPressure >= 2) {
    signals.push({
      id: 'sig-2',
      source: 'whale',
      title: 'Distribution Pattern Detected',
      description: `${sellPressure} major sell transactions in last 10 minutes`,
      confidence: 'high',
      timestamp: now,
      data: recentWhales.filter(w => w.type === 'sell'),
      recommendation: 'Consider reducing exposure, watch for support levels',
    });
  } else if (buyPressure > sellPressure && buyPressure >= 2) {
    signals.push({
      id: 'sig-3',
      source: 'whale',
      title: 'Accumulation Pattern Detected',
      description: `${buyPressure} major buy transactions in last 10 minutes`,
      confidence: 'high',
      timestamp: now,
      data: recentWhales.filter(w => w.type === 'buy'),
      recommendation: 'Smart money accumulating, consider entry on dips',
    });
  }

  // High yield opportunity signal
  const highYields = yields.filter(y => y.apy > 15 && y.tvl > 10000000);
  if (highYields.length > 0) {
    signals.push({
      id: 'sig-4',
      source: 'yield',
      title: 'Elevated Yield Opportunities',
      description: `${highYields.length} pools showing >15% APY with substantial TVL`,
      confidence: 'medium',
      timestamp: now,
      data: highYields,
      recommendation: 'Due diligence required - verify contract audits before depositing',
    });
  }

  // Intelligence correlation: Aircraft + Seismic
  if (aircraft.length > 50 && earthquakes.length > 0) {
    signals.push({
      id: 'sig-5',
      source: 'aircraft',
      title: 'Unusual Activity Pattern',
      description: 'High aircraft density correlating with seismic events',
      confidence: 'medium',
      timestamp: now,
      data: { aircraft: aircraft.length, earthquakes: earthquakes.length },
      recommendation: 'Potential geopolitical flashpoint - monitor news flow',
    });
  }

  return signals.sort((a, b) => {
    const confidenceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
  });
}
