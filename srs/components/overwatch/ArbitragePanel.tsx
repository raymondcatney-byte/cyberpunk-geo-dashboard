import { useState, useEffect, useCallback } from 'react';
import { GitCompare, AlertTriangle, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import { ARBITRAGE_PAIRS, CATEGORY_COLORS } from '../../config/polymarketWatchlist';

interface MarketPrice {
  slug: string;
  question: string;
  yesPrice: number;
  impliedProbability: number;
  category: string;
  url: string;
  status?: 'active' | 'closed' | 'resolved' | 'missing';
}

interface ArbitrageOpportunity {
  pairIndex: number;
  marketA: MarketPrice;
  marketB: MarketPrice;
  divergence: number;
  correlation: string;
  signal: 'BUY_A' | 'BUY_B' | 'NEUTRAL';
}

export function ArbitragePanel() {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [minDivergence, setMinDivergence] = useState(5);

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/polymarket/watchlist');
      const data = await res.json();
      const rows = Array.isArray(data?.markets) ? data.markets : [];
      const priceData: Record<string, MarketPrice> = {};

      rows.forEach((market: any) => {
        if (!market?.slug || market.status === 'missing') return;
        priceData[market.slug] = {
          slug: market.slug,
          question: market.question,
          yesPrice: Number(market.yesPrice || 0),
          impliedProbability: Number(market.yesPrice || 0) * 100,
          category: String(market.category || 'other'),
          url: String(market.url || `https://polymarket.com/event/${market.slug}`),
          status: market.status,
        };
      });

      const ops: ArbitrageOpportunity[] = [];

      ARBITRAGE_PAIRS.forEach((pair, idx) => {
        const marketA = priceData[pair.marketA];
        const marketB = priceData[pair.marketB];
        if (marketA && marketB) {
          const divergence = Math.abs(marketA.impliedProbability - marketB.impliedProbability);
          if (divergence >= pair.divergenceThreshold) {
            const signal = marketA.impliedProbability < marketB.impliedProbability ? 'BUY_A' : 'BUY_B';
            ops.push({
              pairIndex: idx,
              marketA,
              marketB,
              divergence,
              correlation: pair.correlation,
              signal,
            });
          }
        }
      });

      ops.sort((a, b) => b.divergence - a.divergence);
      setOpportunities(ops);
    } catch (err) {
      console.error('Failed to fetch watchlist prices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const filteredOps = opportunities.filter(op => op.divergence >= minDivergence);

  if (loading && opportunities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-nerv-rust">
        <div className="w-8 h-8 border-2 border-nerv-orange border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-mono">Scanning for arbitrage...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header & Filter */}
      <div className="p-4 border-b border-nerv-brown bg-nerv-void-panel">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[10px] text-nerv-rust font-mono uppercase tracking-wider">
              Cross-Market Arbitrage
            </h3>
            <p className="text-[9px] text-nerv-rust/60 font-mono mt-1">
              Find correlated market divergences
            </p>
          </div>
          {opportunities.length > 0 && (
            <div className="px-2 py-1 bg-nerv-orange/20 border border-nerv-orange rounded">
              <span className="text-[10px] text-nerv-orange font-mono">{opportunities.length} ops</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-nerv-rust font-mono">Min divergence:</span>
          <div className="flex gap-1">
            {[5, 10, 15, 20].map((pct) => (
              <button
                key={pct}
                onClick={() => setMinDivergence(pct)}
                className={`px-2 py-1 text-[9px] font-mono rounded border transition-all ${
                  minDivergence === pct
                    ? 'bg-nerv-orange/20 border-nerv-orange text-nerv-orange'
                    : 'bg-nerv-void border-nerv-brown text-nerv-rust hover:border-nerv-orange/50'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="flex-1 overflow-y-auto">
        {filteredOps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-nerv-rust p-8">
            <GitCompare className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm font-mono">No arbitrage opportunities found</p>
            <p className="text-[10px] text-nerv-rust/60 mt-2 text-center">
              Markets are efficiently priced. Try lowering the divergence threshold.
            </p>
          </div>
        ) : (
          filteredOps.map((op, idx) => (
            <div
              key={idx}
              className="p-4 border-b border-nerv-brown/30 hover:bg-nerv-void-panel/50 transition-colors"
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase bg-nerv-orange/20 text-nerv-orange">
                  {op.correlation}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-data-green/20 text-data-green">
                  {op.divergence.toFixed(1)}% divergence
                </span>
              </div>

              {/* Market A */}
              <div className={`p-3 rounded border mb-2 ${
                op.signal === 'BUY_A' ? 'bg-green-500/10 border-green-500/30' : 'bg-nerv-void border-nerv-brown/30'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[8px] px-1 rounded font-mono uppercase"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[op.marketA.category]}20`,
                          color: CATEGORY_COLORS[op.marketA.category]
                        }}
                      >
                        {op.marketA.category}
                      </span>
                      {op.signal === 'BUY_A' && (
                        <span className="text-[8px] px-1 rounded font-mono bg-green-500/20 text-green-400 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> BUY
                        </span>
                      )}
                    </div>
                    <div className="text-nerv-amber text-[11px] leading-snug line-clamp-2">
                      {op.marketA.question}
                    </div>
                  </div>
                  <a
                    href={op.marketA.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-nerv-rust hover:text-nerv-orange"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="mt-2 text-lg font-mono text-nerv-amber">
                  {op.marketA.impliedProbability.toFixed(1)}¢
                </div>
              </div>

              {/* Comparison Arrow */}
              <div className="flex items-center justify-center py-1">
                <GitCompare className="w-4 h-4 text-nerv-rust" />
              </div>

              {/* Market B */}
              <div className={`p-3 rounded border ${
                op.signal === 'BUY_B' ? 'bg-green-500/10 border-green-500/30' : 'bg-nerv-void border-nerv-brown/30'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[8px] px-1 rounded font-mono uppercase"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[op.marketB.category]}20`,
                          color: CATEGORY_COLORS[op.marketB.category]
                        }}
                      >
                        {op.marketB.category}
                      </span>
                      {op.signal === 'BUY_B' && (
                        <span className="text-[8px] px-1 rounded font-mono bg-green-500/20 text-green-400 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> BUY
                        </span>
                      )}
                    </div>
                    <div className="text-nerv-amber text-[11px] leading-snug line-clamp-2">
                      {op.marketB.question}
                    </div>
                  </div>
                  <a
                    href={op.marketB.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-nerv-rust hover:text-nerv-orange"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="mt-2 text-lg font-mono text-nerv-amber">
                  {op.marketB.impliedProbability.toFixed(1)}¢
                </div>
              </div>

              {/* Strategy Note */}
              <div className="mt-3 p-2 bg-nerv-orange/5 border border-nerv-orange/20 rounded">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-nerv-orange mt-0.5" />
                  <div className="text-[9px] text-nerv-rust font-mono">
                    <span className="text-nerv-orange">Strategy: </span>
                    {op.signal === 'BUY_A' ? (
                      <>Market A is underpriced relative to Market B. Consider buying YES on A.</>
                    ) : op.signal === 'BUY_B' ? (
                      <>Market B is underpriced relative to Market A. Consider buying YES on B.</>
                    ) : (
                      <>Markets are misaligned. Verify correlation assumption.</>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
