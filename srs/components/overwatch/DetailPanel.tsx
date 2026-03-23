import { X, ExternalLink, Star, Copy } from 'lucide-react';
import type { Opportunity } from '../../hooks/usePolymarketOpportunities';

interface DetailPanelProps {
  opportunity: Opportunity;
  onClose: () => void;
}

const ANOMALY_LABELS: Record<string, string> = {
  volume_spike: 'Volume Spike',
  price_swing: 'Price Swing',
  volume_accel: 'Volume Accel',
  liquidity: 'Liquidity',
  smart_money: 'Smart Money',
};

const ANOMALY_ICONS: Record<string, string> = {
  volume_spike: '🔥',
  price_swing: '📊',
  volume_accel: '⚡',
  liquidity: '💧',
  smart_money: '🧠',
};

function getSignalLabel(score: number): { text: string; color: string; confidence: number } {
  if (score >= 80) return { text: 'STRONG BUY', color: 'text-green-400', confidence: 94 };
  if (score >= 60) return { text: 'BUY', color: 'text-green-300', confidence: 78 };
  if (score >= 40) return { text: 'HOLD', color: 'text-nerv-rust', confidence: 62 };
  if (score >= 20) return { text: 'SELL', color: 'text-red-300', confidence: 71 };
  return { text: 'STRONG SELL', color: 'text-red-400', confidence: 85 };
}

export function DetailPanel({ opportunity, onClose }: DetailPanelProps) {
  const { market, anomalies, compositeScore } = opportunity;
  const signal = getSignalLabel(compositeScore);

  const formatCurrency = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  };

  return (
    <div className="w-[360px] border-l border-nerv-orange bg-nerv-void-panel overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-nerv-brown">
        <span className="text-[10px] text-nerv-rust font-mono uppercase">
          Category: {market.category}
        </span>
        <button
          onClick={onClose}
          className="p-1 hover:bg-nerv-orange/10 transition-colors"
        >
          <X className="w-4 h-4 text-nerv-rust" />
        </button>
      </div>

      <div className="p-4">
        {/* Title */}
        <h2 className="text-lg text-nerv-amber font-mono mb-4">
          {market.question}
        </h2>

        {/* Probabilities */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-green-400 font-mono text-xl font-bold">
            YES {(market.yesPrice * 100).toFixed(1)}%
          </span>
          <span className="text-red-400 font-mono text-xl font-bold">
            NO {(market.noPrice * 100).toFixed(1)}%
          </span>
        </div>
        <div className="h-3 bg-nerv-void rounded-sm overflow-hidden flex mb-6">
          <div className="h-full bg-green-500" style={{ width: `${market.yesPrice * 100}%` }} />
          <div className="h-full bg-red-500" style={{ width: `${market.noPrice * 100}%` }} />
        </div>

        {/* Anomaly Score */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-nerv-rust text-sm font-mono">ANOMALY SCORE</span>
            <span className="text-nerv-orange text-xl font-bold font-mono">
              {compositeScore}/10
            </span>
          </div>
          <div className="h-2 bg-nerv-void rounded-sm overflow-hidden">
            <div
              className="h-full bg-nerv-orange"
              style={{ width: `${(compositeScore / 100) * 100}%` }}
            />
          </div>
        </div>

        {/* Anomaly Breakdown */}
        <div className="mb-6">
          <h3 className="text-[10px] text-nerv-rust font-mono uppercase tracking-wider mb-3">
            ANOMALIES DETECTED
          </h3>
          <div className="space-y-2">
            {anomalies.map((anomaly) => (
              <div key={anomaly} className="flex items-center gap-2">
                <span className="text-lg">{ANOMALY_ICONS[anomaly]}</span>
                <span className="text-nerv-amber text-sm font-mono">
                  {ANOMALY_LABELS[anomaly]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Signal */}
        <div className="mb-6 p-3 bg-nerv-void border border-nerv-brown">
          <div className={`text-sm font-mono font-bold ${signal.color}`}>
            SIGNAL: {signal.text}
          </div>
          <div className="text-nerv-rust text-xs font-mono mt-1">
            {signal.confidence}% confidence
          </div>
        </div>

        {/* Analysis */}
        <div className="mb-6">
          <h3 className="text-[10px] text-nerv-rust font-mono uppercase tracking-wider mb-2">
            ANALYSIS
          </h3>
          <p className="text-nerv-rust text-xs font-mono leading-relaxed">
            Unusual activity detected. {anomalies.includes('smart_money') 
              ? 'Smart money positioning suggests high-confidence information advantage.' 
              : 'Volume and price movements indicate significant market interest.'} 
            {anomalies.includes('liquidity') && ' Tight spreads indicate institutional participation.'}
          </p>
        </div>

        {/* Metrics */}
        <div className="mb-6">
          <h3 className="text-[10px] text-nerv-rust font-mono uppercase tracking-wider mb-3">
            METRICS
          </h3>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-nerv-rust">Volume</span>
              <span className="text-nerv-amber">{formatCurrency(market.volume)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-nerv-rust">Liquidity</span>
              <span className="text-nerv-amber">{formatCurrency(market.liquidity)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-nerv-rust">Spread</span>
              <span className="text-nerv-amber">
                {Math.abs(market.yesPrice - market.noPrice).toFixed(3)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <a
            href={market.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-nerv-orange-faint border border-nerv-orange text-nerv-orange text-xs font-mono uppercase hover:bg-nerv-orange/20 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            View on Polymarket
          </a>
          <button className="px-3 py-2 border border-nerv-brown text-nerv-rust hover:border-nerv-orange transition-colors">
            <Copy className="w-4 h-4" />
          </button>
          <button className="px-3 py-2 border border-nerv-brown text-nerv-rust hover:border-nerv-orange transition-colors">
            <Star className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
