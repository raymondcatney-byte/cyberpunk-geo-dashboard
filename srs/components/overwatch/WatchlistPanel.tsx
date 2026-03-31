import { useState, useEffect, useCallback } from 'react';
import { Plus, Minus, TrendingUp, TrendingDown, ExternalLink, AlertCircle, RefreshCw, AlertTriangle, Activity, Zap } from 'lucide-react';
import { POLYMARKET_WATCHLIST, CATEGORY_COLORS, type WatchlistMarket } from '../../config/polymarketWatchlist';
import { useWatchlistAnomalies } from '../../hooks/useWatchlistAnomalies';
import { useCategoryAnomalies } from '../../hooks/useCategoryAnomalies';

interface Position {
  slug: string;
  side: 'YES' | 'NO';
  shares: number;
  entryPrice: number;
}

interface MarketData {
  id?: string;
  slug: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  endDate: string;
  category: string;
  url?: string;
  status?: 'active' | 'closed' | 'resolved' | 'missing';
  outcome?: 'YES' | 'NO' | 'CANCELLED' | 'UNKNOWN';
}

export function WatchlistPanel() {
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPositionModal, setShowPositionModal] = useState<string | null>(null);
  const [newPosition, setNewPosition] = useState<{ side: 'YES' | 'NO'; shares: number; entryPrice: number }>({ side: 'YES', shares: 0, entryPrice: 0 });
  
  // Mode toggle: 'watchlist' or 'category'
  const [anomalyMode, setAnomalyMode] = useState<'watchlist' | 'category'>('watchlist');
  
  // Anomaly detection - Watchlist mode
  const {
    marketAnomalies: watchlistAnomalies,
    arbitrageAnomalies,
    totalAnomalies: watchlistTotal,
    criticalCount: watchlistCritical,
    lastScanTime: watchlistScanTime,
    isScanning: isWatchlistScanning,
    scanNow: scanWatchlist,
    snapshotCount,
  } = useWatchlistAnomalies();
  
  // Anomaly detection - Category mode
  const {
    allAnomalies: categoryAnomalies,
    totalAnomalies: categoryTotal,
    criticalCount: categoryCritical,
    lastScanTime: categoryScanTime,
    isScanning: isCategoryScanning,
    scanNow: scanCategory,
    activeCategories,
    toggleCategory,
  } = useCategoryAnomalies();
  
  // Use the appropriate anomaly data based on mode
  const marketAnomalies = anomalyMode === 'watchlist' ? watchlistAnomalies : categoryAnomalies;
  const totalAnomalies = anomalyMode === 'watchlist' ? watchlistTotal : categoryTotal;
  const criticalCount = anomalyMode === 'watchlist' ? watchlistCritical : categoryCritical;
  const lastScanTime = anomalyMode === 'watchlist' ? watchlistScanTime : categoryScanTime;
  const isScanning = anomalyMode === 'watchlist' ? isWatchlistScanning : isCategoryScanning;
  const scanNow = anomalyMode === 'watchlist' ? scanWatchlist : scanCategory;
  
  // Get anomalies for a specific market
  const getMarketAnomalies = (slug: string) => {
    return marketAnomalies.find(a => a.slug === slug)?.anomalies || [];
  };

  // Load positions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('polymarket_positions');
    if (saved) {
      try {
        setPositions(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Save positions to localStorage
  useEffect(() => {
    localStorage.setItem('polymarket_positions', JSON.stringify(positions));
  }, [positions]);

  // Fetch market data via our API (avoids CORS issues)
  const fetchMarketData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/polymarket/watchlist');
      const data = await res.json();
      
      if (data.markets && Array.isArray(data.markets)) {
        const marketMap: Record<string, MarketData> = {};
        
        data.markets.forEach((m: any) => {
          const config = POLYMARKET_WATCHLIST.find(w => w.slug === m.slug);
          marketMap[m.slug] = {
            slug: m.slug,
            question: m.question,
            yesPrice: m.yesPrice,
            noPrice: m.noPrice,
            volume: m.volume,
            liquidity: m.liquidity,
            endDate: m.endDate,
            category: config?.category || 'other',
            url: m.url,
            status: m.status,
            outcome: m.outcome,
          };
        });
        
        setMarketData(marketMap);
      } else {
        setError('No markets returned from API');
      }
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
      setError('Failed to fetch markets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  const addPosition = (slug: string) => {
    setPositions(prev => ({
      ...prev,
      [slug]: { slug, ...newPosition }
    }));
    setShowPositionModal(null);
    setNewPosition({ side: 'YES', shares: 0, entryPrice: 0 });
  };

  const removePosition = (slug: string) => {
    setPositions(prev => {
      const updated = { ...prev };
      delete updated[slug];
      return updated;
    });
  };

  const calculatePnL = (slug: string): number | null => {
    const position = positions[slug];
    const data = marketData[slug];
    if (!position || !data) return null;

    const currentPrice = position.side === 'YES' ? data.yesPrice : data.noPrice;
    const pnl = (currentPrice - position.entryPrice) * position.shares;
    return pnl;
  };

  const totalPortfolioValue = () => {
    let total = 0;
    Object.entries(positions).forEach(([slug, pos]) => {
      const data = marketData[slug];
      if (data) {
        const currentPrice = pos.side === 'YES' ? data.yesPrice : data.noPrice;
        total += currentPrice * pos.shares;
      }
    });
    return total;
  };

  const totalPnL = () => {
    let total = 0;
    Object.keys(positions).forEach(slug => {
      const pnl = calculatePnL(slug);
      if (pnl !== null) total += pnl;
    });
    return total;
  };

  // Format time since last scan
  const getTimeSinceScan = () => {
    if (!lastScanTime) return 'Never';
    const seconds = Math.floor((Date.now() - lastScanTime.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Anomaly Alert Banner */}
      {criticalCount > 0 && (
        <div className="p-3 border-b border-alert-red/50 bg-alert-red/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-alert-red" />
            <span className="text-[11px] font-mono text-alert-red">
              {criticalCount} Critical Anomaly{criticalCount > 1 ? 'ies' : ''} Detected
            </span>
          </div>
        </div>
      )}
      
      {/* Anomaly Mode Toggle */}
      <div className="px-4 py-2 border-b border-nerv-brown bg-nerv-void">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-nerv-rust font-mono">ANOMALY SCAN MODE</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setAnomalyMode('watchlist')}
              className={`px-2 py-1 text-[9px] font-mono rounded border ${
                anomalyMode === 'watchlist'
                  ? 'bg-nerv-orange/20 border-nerv-orange text-nerv-orange'
                  : 'border-nerv-brown text-nerv-rust hover:border-nerv-orange/50'
              }`}
            >
              Watchlist (22)
            </button>
            <button
              onClick={() => setAnomalyMode('category')}
              className={`px-2 py-1 text-[9px] font-mono rounded border ${
                anomalyMode === 'category'
                  ? 'bg-nerv-orange/20 border-nerv-orange text-nerv-orange'
                  : 'border-nerv-brown text-nerv-rust hover:border-nerv-orange/50'
              }`}
            >
              Category Top 10
            </button>
          </div>
        </div>
        {anomalyMode === 'category' && (
          <div className="flex flex-wrap gap-1 mt-2">
            {['geopolitics', 'economy', 'commodities', 'crypto', 'biotech', 'ai'].map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat as any)}
                className={`px-1.5 py-0.5 text-[8px] font-mono uppercase rounded border ${
                  activeCategories.includes(cat as any)
                    ? 'bg-nerv-orange/20 border-nerv-orange text-nerv-orange'
                    : 'border-nerv-brown/50 text-nerv-rust/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Portfolio Summary */}
      <div className="p-4 border-b border-nerv-brown bg-nerv-void-panel">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] text-nerv-rust font-mono uppercase tracking-wider">
            Portfolio Summary
          </h3>
          <div className="flex items-center gap-2">
            {totalAnomalies > 0 && (
              <button
                onClick={scanNow}
                disabled={isScanning}
                className="flex items-center gap-1 px-2 py-1 text-[9px] font-mono text-alert-red border border-alert-red/30 rounded hover:bg-alert-red/10"
              >
                <Activity className={`w-3 h-3 ${isScanning ? 'animate-pulse' : ''}`} />
                {totalAnomalies} Alert{totalAnomalies > 1 ? 's' : ''}
              </button>
            )}
            <button
              onClick={fetchMarketData}
              disabled={loading}
              className="flex items-center gap-1 px-2 py-1 text-[9px] font-mono text-nerv-orange border border-nerv-orange/30 rounded hover:bg-nerv-orange/10"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="p-2 bg-nerv-void border border-nerv-brown rounded">
            <div className="text-[9px] text-nerv-rust font-mono">Positions</div>
            <div className="text-lg font-mono text-nerv-amber">{Object.keys(positions).length}</div>
          </div>
          <div className="p-2 bg-nerv-void border border-nerv-brown rounded">
            <div className="text-[9px] text-nerv-rust font-mono">Value</div>
            <div className="text-lg font-mono text-nerv-amber">${totalPortfolioValue().toFixed(2)}</div>
          </div>
          <div className="p-2 bg-nerv-void border border-nerv-brown rounded">
            <div className="text-[9px] text-nerv-rust font-mono">P&L</div>
            <div className={`text-lg font-mono ${totalPnL() >= 0 ? 'text-data-green' : 'text-alert-red'}`}>
              {totalPnL() >= 0 ? '+' : ''}{totalPnL().toFixed(2)}
            </div>
          </div>
          <div className="p-2 bg-nerv-void border border-nerv-brown rounded">
            <div className="text-[9px] text-nerv-rust font-mono">Anomalies</div>
            <div className={`text-lg font-mono ${totalAnomalies > 0 ? 'text-alert-red' : 'text-data-green'}`}>
              {totalAnomalies}
            </div>
          </div>
        </div>
        
        {/* Scan Status */}
        <div className="flex items-center justify-between mt-2 text-[8px] text-nerv-rust/60 font-mono">
          <span>Last scan: {getTimeSinceScan()}</span>
          <span>Snapshots: {snapshotCount}/48</span>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 border-b border-alert-red/30 bg-alert-red/10">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-alert-red mt-0.5" />
            <div>
              <p className="text-[11px] text-alert-red font-mono">{error}</p>
              <p className="text-[9px] text-nerv-rust/60 mt-1">
                Showing watchlist with available data. Some markets may be closed or unavailable.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Watchlist Markets */}
      <div className="flex-1 overflow-y-auto">
        {loading && Object.keys(marketData).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-nerv-rust">
            <div className="w-8 h-8 border-2 border-nerv-orange border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-mono">Loading watchlist...</p>
          </div>
        ) : (
          POLYMARKET_WATCHLIST.map((market) => {
            const data = marketData[market.slug];
            const position = positions[market.slug];
            const pnl = calculatePnL(market.slug);

            return (
              <div
                key={market.slug}
                className="p-4 border-b border-nerv-brown/30 hover:bg-nerv-void-panel/50 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[market.category]}20`,
                          color: CATEGORY_COLORS[market.category]
                        }}
                      >
                        {market.category}
                      </span>
                      {position && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                          position.side === 'YES' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {position.side} {position.shares}
                        </span>
                      )}
                      {/* Anomaly Badges */}
                      {getMarketAnomalies(market.slug).map((anomaly, idx) => (
                        <span
                          key={idx}
                          className={`text-[8px] px-1.5 py-0.5 rounded font-mono flex items-center gap-1 ${
                            anomaly.severity === 'critical' ? 'bg-alert-red/20 text-alert-red' :
                            anomaly.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}
                          title={anomaly.message}
                        >
                          <Zap className="w-2 h-2" />
                          {anomaly.type.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-nerv-amber font-medium text-[13px] leading-snug">
                      {data?.question || market.displayName}
                    </h3>
                  </div>
                  {data && (
                    <a
                      href={data.url || `https://polymarket.com/event/${data.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-nerv-rust hover:text-nerv-orange transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Prices */}
                {data ? (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="p-2 bg-nerv-void rounded border border-nerv-brown/30">
                      <div className="text-[8px] text-nerv-rust font-mono">YES</div>
                      <div className="text-sm font-mono text-green-400">{(data.yesPrice * 100).toFixed(1)}¢</div>
                    </div>
                    <div className="p-2 bg-nerv-void rounded border border-nerv-brown/30">
                      <div className="text-[8px] text-nerv-rust font-mono">NO</div>
                      <div className="text-sm font-mono text-red-400">{(data.noPrice * 100).toFixed(1)}¢</div>
                    </div>
                    <div className="p-2 bg-nerv-void rounded border border-nerv-brown/30">
                      <div className="text-[8px] text-nerv-rust font-mono">VOL</div>
                      <div className="text-sm font-mono text-nerv-amber">${(data.volume / 1000000).toFixed(1)}M</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 mb-3 bg-nerv-void/50 border border-nerv-brown/30 rounded">
                    <p className="text-[10px] text-nerv-rust/60 font-mono">Market data unavailable</p>
                  </div>
                )}

                {/* Position & P&L */}
                {position && pnl !== null && (
                  <div className={`flex items-center justify-between p-2 rounded ${pnl >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <div className="text-xs font-mono">
                      <span className="text-nerv-rust">Entry: </span>
                      <span className="text-nerv-amber">{(position.entryPrice * 100).toFixed(1)}¢</span>
                    </div>
                    <div className={`text-sm font-mono font-bold ${pnl >= 0 ? 'text-data-green' : 'text-alert-red'}`}>
                      {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  {position ? (
                    <button
                      onClick={() => removePosition(market.slug)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded text-[10px] font-mono text-red-400 transition-colors"
                    >
                      <Minus className="w-3 h-3" /> Close Position
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowPositionModal(market.slug)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-nerv-orange/10 hover:bg-nerv-orange/20 border border-nerv-orange/30 rounded text-[10px] font-mono text-nerv-orange transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Position
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Arbitrage Anomalies Section */}
      {arbitrageAnomalies.length > 0 && (
        <div className="p-4 border-b border-nerv-brown bg-alert-red/5">
          <h3 className="text-[10px] text-alert-red font-mono uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="w-3 h-3" />
            Arbitrage Divergences ({arbitrageAnomalies.length})
          </h3>
          <div className="space-y-2">
            {arbitrageAnomalies.map((arb, idx) => (
              <div
                key={idx}
                className={`p-2 rounded border text-[10px] font-mono ${
                  arb.severity === 'critical' 
                    ? 'bg-alert-red/10 border-alert-red/30 text-alert-red' :
                  arb.severity === 'high'
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                    : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{arb.message}</span>
                  <span className="opacity-70">{(arb.divergence * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Position Modal */}
      {showPositionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-nerv-void-panel border border-nerv-brown p-6 rounded max-w-sm w-full">
            <h3 className="text-nerv-amber font-mono text-sm mb-4">Add Position</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-nerv-rust font-mono uppercase block mb-1">Side</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewPosition(p => ({ ...p, side: 'YES' }))}
                    className={`flex-1 py-2 text-xs font-mono rounded border ${
                      newPosition.side === 'YES'
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : 'bg-nerv-void border-nerv-brown text-nerv-rust'
                    }`}
                  >
                    YES
                  </button>
                  <button
                    onClick={() => setNewPosition(p => ({ ...p, side: 'NO' }))}
                    className={`flex-1 py-2 text-xs font-mono rounded border ${
                      newPosition.side === 'NO'
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : 'bg-nerv-void border-nerv-brown text-nerv-rust'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-nerv-rust font-mono uppercase block mb-1">Shares</label>
                <input
                  type="number"
                  value={newPosition.shares || ''}
                  onChange={(e) => setNewPosition(p => ({ ...p, shares: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-nerv-void border border-nerv-brown rounded px-3 py-2 text-nerv-amber font-mono text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-[10px] text-nerv-rust font-mono uppercase block mb-1">Entry Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newPosition.entryPrice || ''}
                  onChange={(e) => setNewPosition(p => ({ ...p, entryPrice: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-nerv-void border border-nerv-brown rounded px-3 py-2 text-nerv-amber font-mono text-sm"
                  placeholder="0.50"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowPositionModal(null)}
                  className="flex-1 py-2 bg-nerv-void border border-nerv-brown rounded text-nerv-rust font-mono text-xs hover:bg-nerv-void-panel"
                >
                  Cancel
                </button>
                <button
                  onClick={() => addPosition(showPositionModal)}
                  className="flex-1 py-2 bg-nerv-orange/20 border border-nerv-orange rounded text-nerv-orange font-mono text-xs hover:bg-nerv-orange/30"
                >
                  Add Position
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
