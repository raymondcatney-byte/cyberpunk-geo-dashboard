import { useState } from 'react';
import { usePolymarketOpportunities, type FilterPreset, type AnomalyType } from '../../hooks/usePolymarketOpportunities';
import { RefreshCw, TrendingUp, AlertCircle, Filter, ExternalLink } from 'lucide-react';

interface OpportunityStreamV2Props {
  className?: string;
}

const PRESETS: { id: FilterPreset; label: string; description: string }[] = [
  { id: 'all', label: 'ALL', description: 'All opportunities' },
  { id: 'smart_money', label: 'SMART MONEY', description: 'High volume + tight spread + price move' },
  { id: 'major', label: 'MAJOR', description: 'High volume or multiple signals' },
  { id: 'volatility', label: 'VOLATILITY', description: 'Price swings or volume spikes' },
];

const ANOMALY_COLORS: Record<AnomalyType, string> = {
  volume_spike: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  price_swing: 'bg-red-500/20 text-red-400 border-red-500/40',
  volume_accel: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  liquidity: 'bg-green-500/20 text-green-400 border-green-500/40',
  smart_money: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
};

const ANOMALY_LABELS: Record<AnomalyType, string> = {
  volume_spike: 'VOL SPIKE',
  price_swing: 'PRICE SWING',
  volume_accel: 'VOL ACCEL',
  liquidity: 'LIQUIDITY',
  smart_money: 'SMART MONEY',
};

export function OpportunityStreamV2({ className = '' }: OpportunityStreamV2Props) {
  const [preset, setPreset] = useState<FilterPreset>('all');
  const { opportunities, loading, error, refresh, lastUpdated } = usePolymarketOpportunities({
    preset,
    limit: 10,
    refreshInterval: 60000,
  });

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Ended';
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    if (days < 30) return `${days} days`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  if (loading && opportunities.length === 0) {
    return (
      <div className={`nerv-panel p-4 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 text-nerv-orange animate-spin" />
          <span className="ml-2 text-nerv-orange font-mono text-sm">
            Scanning Polymarket for anomalies...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`nerv-panel nerv-panel-alert p-4 ${className}`}>
        <div className="flex items-center text-nerv-alert">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="font-mono">Failed to load opportunities</span>
        </div>
        <button
          onClick={refresh}
          className="nerv-button mt-2 text-[10px] px-3 py-1"
        >
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className={`nerv-panel ${className}`}>
      {/* Header */}
      <div className="flex flex-col gap-3 p-3 border-b border-nerv-orange bg-nerv-void-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-nerv-orange" />
            <span className="text-sm font-bold uppercase tracking-wider text-nerv-orange font-display">
              Anomaly Stream
            </span>
            <span className="text-[11px] text-nerv-rust font-mono">
              ({opportunities.length} detected)
            </span>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-[10px] text-nerv-rust font-mono">
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={refresh}
              disabled={loading}
              className="p-1 hover:bg-nerv-orange/10 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-nerv-orange ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Presets */}
        <div className="flex items-center gap-2">
          <Filter className="w-3 h-3 text-nerv-rust" />
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                className={`px-2 py-1 text-[9px] font-mono uppercase border transition-colors ${
                  preset === p.id
                    ? 'bg-nerv-orange text-nerv-void border-nerv-orange'
                    : 'bg-nerv-void text-nerv-rust border-nerv-brown hover:border-nerv-orange'
                }`}
                title={p.description}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Opportunity List */}
      <div className="max-h-[400px] overflow-y-auto">
        {opportunities.length === 0 ? (
          <div className="p-8 text-center text-nerv-rust font-mono">
            No anomalies detected with current filters.
            <br />
            <span className="text-[11px]">Try changing the preset filter.</span>
          </div>
        ) : (
          <div>
            {opportunities.map((opp, index) => (
              <div
                key={opp.market.id}
                className="p-3 border-b border-nerv-brown/50 hover:bg-nerv-orange/5 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Rank & Title */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-nerv-rust font-mono">
                        #{String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-nerv-orange/20 text-nerv-orange border border-nerv-orange/50 font-mono uppercase">
                        {opp.market.category}
                      </span>
                      <span className="text-[12px] font-bold text-nerv-amber font-mono">
                        {opp.compositeScore}
                      </span>
                    </div>
                    
                    <h4 className="mt-1 text-sm text-nerv-amber line-clamp-2 font-mono group-hover:opacity-80">
                      {opp.market.question}
                    </h4>
                    
                    {/* Anomaly Badges */}
                    {opp.anomalies.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {opp.anomalies.map((anomaly) => (
                          <span
                            key={anomaly}
                            className={`text-[9px] px-1.5 py-0.5 border font-mono ${ANOMALY_COLORS[anomaly]}`}
                          >
                            {ANOMALY_LABELS[anomaly]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Trade Button */}
                  <a
                    href={opp.market.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-2 hover:bg-nerv-orange/20 transition-colors"
                    title="Open on Polymarket"
                  >
                    <ExternalLink className="w-4 h-4 text-nerv-orange" />
                  </a>
                </div>

                {/* Price & Volume Row */}
                <div className="mt-2 flex items-center gap-4 text-xs text-nerv-rust font-mono">
                  <span>
                    YES: <span className="text-nerv-amber">{(opp.market.yesPrice * 100).toFixed(1)}%</span>
                  </span>
                  <span>
                    VOL: <span className="text-nerv-amber">{formatCurrency(opp.market.volume)}</span>
                  </span>
                  <span>
                    LIQ: <span className="text-nerv-amber">{formatCurrency(opp.market.liquidity)}</span>
                  </span>
                  <span>
                    ENDS: <span className="text-nerv-amber">{formatDate(opp.market.endDate)}</span>
                  </span>
                </div>

                {/* Score */}
                <div className="mt-2 pt-2 border-t border-nerv-brown/30">
                  <div className="text-[9px] text-nerv-rust font-mono">
                    Composite Score: <span className="text-nerv-amber">{opp.compositeScore}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
