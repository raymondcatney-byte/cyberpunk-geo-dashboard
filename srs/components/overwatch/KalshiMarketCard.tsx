import { ExternalLink, Flame } from 'lucide-react';
import type { KalshiMarket } from '../../hooks/useKalshiMarkets';
import { getTopicDisplayName } from '../../lib/kalshi-mapper';

interface KalshiMarketCardProps {
  market: KalshiMarket;
}

export function KalshiMarketCard({ market }: KalshiMarketCardProps) {
  const isHighVolume = market.volume > 50000;
  const probabilityColor = market.probability > 50 ? 'text-green-400' : 
                           market.probability > 30 ? 'text-nerv-amber' : 'text-nerv-rust';
  
  const formatVolume = (v: number) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
    return `$${v}`;
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <a
      href={market.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-nerv-void border border-nerv-brown rounded hover:border-nerv-orange transition-all duration-200"
    >
      <div className="p-4">
        {/* Header: Category & Probability */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-nerv-rust">
            {getTopicDisplayName(market.category as any)}
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-mono font-bold ${probabilityColor}`}>
              {market.probability}¢
            </span>
            {isHighVolume && (
              <Flame className="w-4 h-4 text-nerv-red animate-pulse" />
            )}
          </div>
        </div>
        
        {/* Title */}
        <h3 className="text-nerv-amber font-medium text-[13px] leading-snug mb-1 line-clamp-2 group-hover:text-nerv-orange transition-colors">
          {market.title}
        </h3>
        
        {/* Subtitle */}
        <p className="text-[11px] text-nerv-rust mb-3 line-clamp-1">
          {market.subtitle}
        </p>
        
        {/* Prices & Volume */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-nerv-void-panel rounded border border-nerv-brown/50 p-2">
            <div className="text-[8px] text-nerv-rust font-mono uppercase">Bid</div>
            <div className="text-xs font-mono text-green-400">{market.bid}¢</div>
          </div>
          <div className="bg-nerv-void-panel rounded border border-nerv-brown/50 p-2">
            <div className="text-[8px] text-nerv-rust font-mono uppercase">Ask</div>
            <div className="text-xs font-mono text-red-400">{market.ask}¢</div>
          </div>
          <div className="bg-nerv-void-panel rounded border border-nerv-brown/50 p-2">
            <div className="text-[8px] text-nerv-rust font-mono uppercase">Vol</div>
            <div className={`text-xs font-mono ${isHighVolume ? 'text-nerv-orange font-bold' : 'text-nerv-amber'}`}>
              {formatVolume(market.volume)}
            </div>
          </div>
        </div>
        
        {/* Footer: Close Date & Link */}
        <div className="flex items-center justify-between text-[10px] text-nerv-rust">
          <span>Closes: {formatDate(market.closesAt)}</span>
          <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </a>
  );
}
