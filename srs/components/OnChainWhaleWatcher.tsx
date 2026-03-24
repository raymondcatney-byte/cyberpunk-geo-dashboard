import { useState } from 'react';
import { ArrowRightLeft, ChevronUp, ChevronDown, ArrowUpRight, ArrowDownRight, RefreshCw, ExternalLink } from 'lucide-react';
import { useLargeTrades } from '../hooks/useDeFiData';

interface OnChainWhaleWatcherProps {
  enabled?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  layout?: 'floating' | 'stacked';
}

export function OnChainWhaleWatcher({ enabled = true, position = 'top-left', layout = 'floating' }: OnChainWhaleWatcherProps) {
  const [isMinimized, setIsMinimized] = useState(true);
  const { trades, loading, refresh } = useLargeTrades(enabled);

  if (!enabled) return null;

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const containerClass = layout === 'stacked'
    ? 'relative w-full'
    : `absolute ${positionClasses[position]} z-40 pointer-events-auto w-[280px]`;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'buy':
        return <ArrowUpRight className="w-3 h-3 text-green-400" />;
      case 'sell':
        return <ArrowDownRight className="w-3 h-3 text-red-400" />;
      default:
        return <ArrowRightLeft className="w-3 h-3 text-cyan-400/60" />;
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  return (
    <div className={containerClass}>
      <div className="bg-nerv-void/95 backdrop-blur-sm border border-cyan-500/20 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.15)]">
        {/* Header - Always visible */}
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="w-full flex items-center justify-between p-3 bg-cyan-500/10 border-b border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            <span className="text-[11px] font-header font-bold text-cyan-400 uppercase tracking-wide">Large Trades</span>
            <span className="text-[10px] text-cyan-400/60 font-mono">({trades.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {loading && <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />}
            {isMinimized ? (
              <ChevronUp className="w-4 h-4 text-cyan-400/60" />
            ) : (
              <ChevronDown className="w-4 h-4 text-cyan-400/60" />
            )}
          </div>
        </button>

        {/* Expanded Content */}
        {!isMinimized && (
          <div className="p-3 space-y-3">
            {/* Trades List */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-thin">
              {trades.map((trade) => (
                <div
                  key={trade.id}
                  className="p-2 bg-nerv-void/95 border border-cyan-500/20 hover:border-cyan-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(trade.type)}
                      <span className={`text-[10px] font-mono ${
                        trade.type === 'buy' ? 'text-green-400' :
                        trade.type === 'sell' ? 'text-red-400' :
                        'text-cyan-400/60'
                      }`}>
                        {trade.valueFormatted}
                      </span>
                    </div>
                    <span className="text-[9px] text-cyan-400/60 font-mono">{formatTime(trade.timestamp)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-cyan-400/60 font-mono">
                    <span>{trade.tokenSymbol}</span>
                    <span className="text-cyan-400/60 uppercase">via {trade.dex}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] text-cyan-400/60 font-mono uppercase">{trade.chain}</span>
                    <a
                      href={trade.explorerUrl || (trade.txHash.startsWith('0x') ? `https://etherscan.io/tx/${trade.txHash}` : undefined)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400/60 hover:text-cyan-400 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-cyan-500/20">
              <span className="text-[9px] text-cyan-400/60 font-mono uppercase">Trades &gt;$500K via Dune</span>
              <button
                onClick={refresh}
                disabled={loading}
                className="p-1 hover:bg-cyan-500/10 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 text-cyan-400/60 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* Minimized Info */}
        {isMinimized && trades.length > 0 && (
          <div className="px-3 pb-2 space-y-1">
            {trades.slice(0, 2).map((trade) => (
              <div key={trade.id} className="flex items-center gap-2 text-[9px] text-cyan-400/60 font-mono">
                {getTypeIcon(trade.type)}
                <span className={trade.type === 'buy' ? 'text-green-400' : trade.type === 'sell' ? 'text-red-400' : 'text-cyan-400/60'}>
                  {trade.valueFormatted}
                </span>
                <span className="truncate">{trade.tokenSymbol}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
