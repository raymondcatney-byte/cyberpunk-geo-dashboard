import { useState, useEffect, useCallback } from 'react';
import { Clock, Calendar, ExternalLink, AlertTriangle } from 'lucide-react';
import { CATEGORY_COLORS } from '../../config/polymarketWatchlist';

interface MarketResolution {
  slug: string;
  question: string;
  endDate: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  daysLeft: number;
  hoursLeft: number;
  url: string;
}

export function ResolvingPanel() {
  const [markets, setMarkets] = useState<MarketResolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | '7d' | '30d' | '90d'>('all');

  const fetchResolvingMarkets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/polymarket/watchlist');
      const data = await res.json();
      const rows = Array.isArray(data?.markets) ? data.markets : [];
      const resolving: MarketResolution[] = [];

      rows.forEach((market: any) => {
        if (!market?.endDate || market.status === 'missing') return;
        const endDate = new Date(String(market.endDate));
        if (Number.isNaN(endDate.getTime())) return;
        const now = new Date();
        const diffMs = endDate.getTime() - now.getTime();
        const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hoursLeft = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (daysLeft >= -1) {
          resolving.push({
            slug: String(market.slug),
            question: String(market.question || market.slug),
            endDate: String(market.endDate),
            category: String(market.category || 'other'),
            yesPrice: Number(market.yesPrice || 0),
            noPrice: Number(market.noPrice || 0),
            volume: Number(market.volume || 0),
            daysLeft,
            hoursLeft,
            url: String(market.url || `https://polymarket.com/event/${market.slug}`),
          });
        }
      });

      resolving.sort((a, b) => a.daysLeft - b.daysLeft);
      setMarkets(resolving);
    } catch (err) {
      console.error('Failed to fetch resolving watchlist:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResolvingMarkets();
    const interval = setInterval(fetchResolvingMarkets, 60000);
    return () => clearInterval(interval);
  }, [fetchResolvingMarkets]);

  const filteredMarkets = markets.filter(m => {
    if (filter === 'all') return m.daysLeft >= 0;
    if (filter === '7d') return m.daysLeft >= 0 && m.daysLeft <= 7;
    if (filter === '30d') return m.daysLeft >= 0 && m.daysLeft <= 30;
    if (filter === '90d') return m.daysLeft >= 0 && m.daysLeft <= 90;
    return true;
  });

  const getUrgencyColor = (daysLeft: number) => {
    if (daysLeft < 0) return 'text-gray-500';
    if (daysLeft <= 1) return 'text-alert-red';
    if (daysLeft <= 7) return 'text-nerv-orange';
    if (daysLeft <= 30) return 'text-nerv-amber';
    return 'text-data-green';
  };

  const getUrgencyBg = (daysLeft: number) => {
    if (daysLeft < 0) return 'bg-gray-500/10';
    if (daysLeft <= 1) return 'bg-alert-red/10';
    if (daysLeft <= 7) return 'bg-nerv-orange/10';
    if (daysLeft <= 30) return 'bg-nerv-amber/10';
    return 'bg-data-green/10';
  };

  if (loading && markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-nerv-rust">
        <div className="w-8 h-8 border-2 border-nerv-orange border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-mono">Loading resolution dates...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-4 border-b border-nerv-brown bg-nerv-void-panel">
        <div className="flex gap-2">
          {(['all', '7d', '30d', '90d'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded border transition-all ${
                filter === f
                  ? 'bg-nerv-orange/20 border-nerv-orange text-nerv-orange'
                  : 'bg-transparent border-nerv-brown text-nerv-rust hover:border-nerv-orange/50'
              }`}
            >
              {f === 'all' ? 'All' : f === '7d' ? '7 Days' : f === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Countdown List */}
      <div className="flex-1 overflow-y-auto">
        {filteredMarkets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-nerv-rust p-8">
            <Clock className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm font-mono">No markets resolving in this timeframe</p>
          </div>
        ) : (
          filteredMarkets.map((market) => (
            <div
              key={market.slug}
              className="p-4 border-b border-nerv-brown/30 hover:bg-nerv-void-panel/50 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase"
                      style={{
                        backgroundColor: `${CATEGORY_COLORS[market.category]}20`,
                        color: CATEGORY_COLORS[market.category]
                      }}
                    >
                      {market.category}
                    </span>
                    {market.daysLeft < 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-mono bg-gray-500/20 text-gray-400">
                        RESOLVED
                      </span>
                    )}
                  </div>
                  <h3 className="text-nerv-amber font-medium text-[13px] leading-snug">
                    {market.question}
                  </h3>
                </div>
                <a
                  href={market.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-nerv-rust hover:text-nerv-orange transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Countdown Timer */}
              <div className={`p-3 rounded mb-3 ${getUrgencyBg(market.daysLeft)}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className={`w-4 h-4 ${getUrgencyColor(market.daysLeft)}`} />
                  <span className={`text-lg font-mono font-bold ${getUrgencyColor(market.daysLeft)}`}>
                    {market.daysLeft < 0 ? (
                      'Resolved'
                    ) : market.daysLeft === 0 ? (
                      `${market.hoursLeft}h left`
                    ) : (
                      `${market.daysLeft}d ${market.hoursLeft}h left`
                    )}
                  </span>
                </div>
                <div className="text-[10px] text-nerv-rust font-mono">
                  Resolution: {new Date(market.endDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              {/* Current Prices */}
              {market.daysLeft >= 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-nerv-void rounded border border-nerv-brown/30">
                    <div className="text-[8px] text-nerv-rust font-mono">YES</div>
                    <div className="text-sm font-mono text-green-400">{(market.yesPrice * 100).toFixed(1)}¢</div>
                  </div>
                  <div className="p-2 bg-nerv-void rounded border border-nerv-brown/30">
                    <div className="text-[8px] text-nerv-rust font-mono">NO</div>
                    <div className="text-sm font-mono text-red-400">{(market.noPrice * 100).toFixed(1)}¢</div>
                  </div>
                  <div className="p-2 bg-nerv-void rounded border border-nerv-brown/30">
                    <div className="text-[8px] text-nerv-rust font-mono">VOL</div>
                    <div className="text-sm font-mono text-nerv-amber">${(market.volume / 1000000).toFixed(1)}M</div>
                  </div>
                </div>
              )}

              {/* Urgency Warning */}
              {market.daysLeft <= 1 && market.daysLeft >= 0 && (
                <div className="flex items-center gap-2 mt-3 p-2 bg-alert-red/10 border border-alert-red/30 rounded">
                  <AlertTriangle className="w-4 h-4 text-alert-red" />
                  <span className="text-[10px] text-alert-red font-mono">
                    Resolving soon - final trading hours
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
