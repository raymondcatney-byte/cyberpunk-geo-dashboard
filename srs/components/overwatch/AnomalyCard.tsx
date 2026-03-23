import type { AnomalyResult, AnomalyType } from '../../lib/polymarket-anomalies';
import { getAnomalyConfig } from '../../lib/polymarket-anomalies';
import { TrendingUp, TrendingDown, Droplets, DollarSign, Activity } from 'lucide-react';

interface AnomalyCardProps {
  result: AnomalyResult;
  rank: number;
}

export function AnomalyCard({ result, rank }: AnomalyCardProps) {
  const { market, category, score, anomalies, metrics } = result;
  
  // Format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };
  
  const formatPrice = (price: number) => `${(price * 100).toFixed(1)}¢`;
  
  // Determine price direction
  const priceDirection = metrics.priceChangePercent > 0 ? 'up' : metrics.priceChangePercent < 0 ? 'down' : 'neutral';
  
  return (
    <div className="border border-nerv-brown bg-nerv-void-panel hover:border-nerv-orange/50 transition-all p-4">
      {/* Header: Rank + Score */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-nerv-rust font-mono text-sm">#{rank}</span>
          <span className="text-nerv-amber font-mono text-lg font-bold">
            {score.toFixed(1)}
          </span>
          <span className="text-[10px] text-nerv-rust uppercase tracking-wider">SCORE</span>
        </div>
        <div className="flex items-center gap-2">
          {anomalies.map((anomaly) => {
            const config = getAnomalyConfig(anomaly);
            return (
              <span
                key={anomaly}
                className={`px-2 py-1 text-[9px] font-mono uppercase border ${config.color} border-current bg-nerv-void`}
                title={config.label}
              >
                {config.emoji} {anomaly.replace('_', ' ')}
              </span>
            );
          })}
        </div>
      </div>
      
      {/* Market Question */}
      <h3 className="text-nerv-amber text-sm font-medium leading-snug mb-2 line-clamp-2">
        {market.question}
      </h3>
      
      {/* Category + End Date */}
      <div className="flex items-center gap-3 mb-3 text-[10px] text-nerv-rust">
        <span className="uppercase tracking-wider">{category}</span>
        {market.endDate && (
          <span>
            Ends: {new Date(market.endDate).toLocaleDateString()}
          </span>
        )}
      </div>
      
      {/* Prices */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-nerv-void p-2 border border-nerv-brown">
          <div className="text-[9px] text-nerv-rust uppercase tracking-wider mb-1">YES</div>
          <div className="text-nerv-amber font-mono text-sm">{formatPrice(market.yesPrice)}</div>
        </div>
        <div className="bg-nerv-void p-2 border border-nerv-brown">
          <div className="text-[9px] text-nerv-rust uppercase tracking-wider mb-1">NO</div>
          <div className="text-nerv-amber font-mono text-sm">{formatPrice(1 - market.yesPrice)}</div>
        </div>
        <div className="bg-nerv-void p-2 border border-nerv-brown">
          <div className="text-[9px] text-nerv-rust uppercase tracking-wider mb-1">SPREAD</div>
          <div className="text-nerv-amber font-mono text-sm">
            {formatPrice(Math.abs(market.yesPrice - (1 - market.yesPrice)))}
          </div>
        </div>
      </div>
      
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        {/* Volume */}
        <div className="flex items-center gap-1.5">
          <Droplets className="w-3 h-3 text-nerv-rust" />
          <div>
            <div className="text-nerv-rust">Vol 24h</div>
            <div className="text-nerv-amber font-mono">${formatNumber(market.volume24h || market.volume)}</div>
          </div>
        </div>
        
        {/* Liquidity */}
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3 h-3 text-nerv-rust" />
          <div>
            <div className="text-nerv-rust">Liquidity</div>
            <div className="text-nerv-amber font-mono">${formatNumber(market.liquidity)}</div>
          </div>
        </div>
        
        {/* Price Change */}
        <div className="flex items-center gap-1.5">
          {priceDirection === 'up' ? (
            <TrendingUp className="w-3 h-3 text-green-500" />
          ) : priceDirection === 'down' ? (
            <TrendingDown className="w-3 h-3 text-red-500" />
          ) : (
            <Activity className="w-3 h-3 text-nerv-rust" />
          )}
          <div>
            <div className="text-nerv-rust">Change</div>
            <div className={`font-mono ${priceDirection === 'up' ? 'text-green-500' : priceDirection === 'down' ? 'text-red-500' : 'text-nerv-amber'}`}>
              {metrics.priceChangePercent > 0 ? '+' : ''}{metrics.priceChangePercent.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
      
      {/* Metrics Detail (expandable) */}
      <div className="mt-3 pt-3 border-t border-nerv-brown/50">
        <div className="grid grid-cols-2 gap-2 text-[9px] text-nerv-rust">
          <div>Vol Z-Score: <span className="text-nerv-amber font-mono">{metrics.volumeZScore.toFixed(2)}</span></div>
          <div>Vol Accel: <span className="text-nerv-amber font-mono">{metrics.volumeAcceleration.toFixed(1)}x</span></div>
        </div>
      </div>
      
      {/* Link to Polymarket */}
      {market.url && (
        <a
          href={market.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block text-center py-2 text-[10px] uppercase tracking-wider text-nerv-orange border border-nerv-orange/30 hover:bg-nerv-orange/10 transition-colors"
        >
          View on Polymarket →
        </a>
      )}
    </div>
  );
}
