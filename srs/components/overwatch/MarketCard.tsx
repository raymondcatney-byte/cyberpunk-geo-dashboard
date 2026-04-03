import { Star, ExternalLink } from 'lucide-react';
import type { Opportunity } from '../../hooks/usePolymarketOpportunities';

interface MarketCardProps {
  opportunity: Opportunity;
  isSelected: boolean;
  onClick: () => void;
}

const ANOMALY_LABELS: Record<string, string> = {
  volume_spike: 'VOL SPIKE',
  price_swing: 'PRICE SWING',
  volume_accel: 'VOL ACCEL',
  liquidity: 'LIQUIDITY',
  smart_money: 'SMART MONEY',
};

const ANOMALY_COLORS: Record<string, string> = {
  volume_spike: 'text-nerv-orange border-nerv-orange/50',
  price_swing: 'text-nerv-alert border-nerv-alert/50',
  volume_accel: 'text-purple-400 border-purple-400/50',
  liquidity: 'text-green-400 border-green-400/50',
  smart_money: 'text-nerv-amber border-nerv-amber/50',
};

function getSignalLabel(score: number): { text: string; color: string } {
  if (score >= 80) return { text: 'STRONG BUY', color: 'text-green-400' };
  if (score >= 60) return { text: 'BUY', color: 'text-green-300' };
  if (score >= 40) return { text: 'HOLD', color: 'text-nerv-rust' };
  if (score >= 20) return { text: 'SELL', color: 'text-red-300' };
  return { text: 'STRONG SELL', color: 'text-red-400' };
}

export function MarketCard({ opportunity, isSelected, onClick }: MarketCardProps) {
  const { market, anomalies, compositeScore } = opportunity;
  const signal = getSignalLabel(compositeScore);

  const formatCurrency = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Ended';
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    return `${days} days`;
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 border cursor-pointer transition-all nerv-angular-tl ${
        isSelected
          ? 'bg-nerv-orange-faint border-nerv-orange'
          : 'bg-nerv-void-panel border-nerv-brown hover:border-nerv-orange hover:bg-nerv-orange/5'
      }`}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Tags Row */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] px-1.5 py-0.5 bg-nerv-orange-faint text-nerv-orange border border-nerv-orange/50 font-mono uppercase">
              {market.category}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 border font-mono uppercase ${signal.color.replace('text-', 'bg-').replace('400', '400/20')} ${signal.color.replace('text-', 'border-')}`}>
              {signal.text}
            </span>
          </div>

          {/* Title */}
          <h4 className="text-sm text-nerv-amber nerv-mono line-clamp-2">
            {market.question}
          </h4>

          {/* Anomaly Pills */}
          {anomalies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {anomalies.map((anomaly) => (
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

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button className="p-1.5 hover:bg-nerv-orange/10 transition-colors">
            <Star className="w-4 h-4 text-nerv-rust" />
          </button>
          <a
            href={market.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 hover:bg-nerv-orange/10 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-nerv-rust" />
          </a>
        </div>
      </div>

      {/* Probability Bar */}
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 h-2 bg-nerv-void rounded-sm overflow-hidden flex">
          <div
            className="h-full bg-green-500"
            style={{ width: `${market.yesPrice * 100}%` }}
          />
          <div
            className="h-full bg-red-500"
            style={{ width: `${market.noPrice * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-green-400">YES {(market.yesPrice * 100).toFixed(1)}%</span>
          <span className="text-red-400">NO {(market.noPrice * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-3 flex items-center justify-between text-xs text-nerv-rust">
        <div className="flex items-center gap-3 nerv-label">
          <span>VOL: <span className="text-nerv-amber">{formatCurrency(market.volume)}</span></span>
          <span>LIQ: <span className="text-nerv-amber">{formatCurrency(market.liquidity)}</span></span>
          <span>END: <span className="text-nerv-amber">{formatDate(market.endDate)}</span></span>
        </div>
        <span className="text-nerv-orange font-bold nerv-data">{compositeScore}</span>
      </div>
    </div>
  );
}
