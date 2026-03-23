import { useState } from 'react';
import { DollarSign, ChevronUp, ChevronDown, Percent, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { useYieldRadar } from '../hooks/useDeFiData';

interface DeFiYieldRadarProps {
  enabled?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'bottom-right-edge';
}

// Simple sparkline component
function Sparkline({ change }: { change: number }) {
  const isUp = change >= 0;
  // Generate a simple zigzag pattern based on direction
  const points = isUp 
    ? "0,8 3,6 6,7 9,4 12,5 15,2 18,3 20,1"
    : "0,2 3,4 6,3 9,6 12,5 15,8 18,7 20,9";
  
  return (
    <svg className="w-10 h-4" viewBox="0 0 20 10">
      <polyline
        fill="none"
        stroke={isUp ? "#f97316" : "#ef4444"}
        strokeWidth="1.5"
        points={points}
        opacity={0.8}
      />
    </svg>
  );
}

export function DeFiYieldRadar({ enabled = true, position = 'bottom-left' }: DeFiYieldRadarProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const { yields, loading, refresh } = useYieldRadar(enabled);

  if (!enabled) return null;

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right-edge': 'bottom-0 right-4',
  };

  const formatTVL = (tvl: number) => {
    if (tvl >= 1000000000) return `${(tvl / 1000000000).toFixed(1)}B`;
    if (tvl >= 1000000) return `${(tvl / 1000000).toFixed(1)}M`;
    return `${(tvl / 1000).toFixed(1)}K`;
  };

  return (
    <div className={`absolute ${positionClasses[position]} z-40 pointer-events-auto w-[320px]`}>
      <div 
        className="bg-black border border-orange-500/40 overflow-hidden shadow-[0_0_25px_rgba(249,115,22,0.15)]"
        style={{ animation: 'matrixFlicker 4s infinite' }}
      >
        {/* Header */}
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="w-full flex items-center justify-between p-3 bg-orange-500/10 border-b border-orange-500/30 hover:bg-orange-500/15 transition-colors"
        >
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-orange-500" style={{ filter: 'drop-shadow(0 0 4px rgba(249,115,22,0.6))' }} />
            <span 
              className="text-[11px] font-mono font-bold text-orange-500 uppercase tracking-wider"
              style={{ textShadow: '0 0 8px rgba(249, 115, 22, 0.5)' }}
            >
              Yield Matrix
            </span>
            <span className="text-[10px] text-orange-500/60 font-mono">({yields.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {loading && <RefreshCw className="w-3 h-3 text-orange-500 animate-spin" />}
            {isMinimized ? <ChevronUp className="w-4 h-4 text-orange-500/60" /> : <ChevronDown className="w-4 h-4 text-orange-500/60" />}
          </div>
        </button>

        {/* Expanded Content - High Density Grid */}
        {!isMinimized && (
          <div className="p-2">
            {/* Grid Layout */}
            <div className="grid grid-cols-2 gap-1 max-h-[220px] overflow-y-auto scrollbar-thin">
              {yields.slice(0, 10).map((pool, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-black border border-orange-500/20 hover:border-orange-500/50 transition-all group"
                >
                  {/* Row 1: Symbol + Chain */}
                  <div className="flex items-center justify-between mb-1">
                    <span 
                      className="text-[10px] font-mono font-bold text-orange-500/90"
                      style={{ textShadow: '0 0 4px rgba(249, 115, 22, 0.4)' }}
                    >
                      {pool.symbol}
                    </span>
                    <span className="text-[8px] px-1 py-0.5 bg-orange-500/10 border border-orange-500/30 text-orange-500/70 font-mono">
                      {pool.chain.slice(0, 3)}
                    </span>
                  </div>
                  
                  {/* Row 2: APY + Sparkline */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Percent className="w-3 h-3 text-orange-500/60" />
                      <span 
                        className="text-[11px] font-mono text-orange-400"
                        style={{ textShadow: '0 0 6px rgba(249, 115, 22, 0.3)' }}
                      >
                        {pool.apy.toFixed(1)}%
                      </span>
                    </div>
                    <Sparkline change={pool.apyChange24h || 0} />
                  </div>

                  {/* Row 3: TVL + Trend */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[8px] text-orange-500/50 font-mono">TVL {formatTVL(pool.tvl)}</span>
                    {pool.apyChange24h !== undefined && (
                      <div className={`flex items-center gap-0.5 text-[8px] font-mono ${pool.apyChange24h >= 0 ? 'text-orange-400' : 'text-red-400'}`}>
                        {pool.apyChange24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{pool.apyChange24h > 0 ? '+' : ''}{pool.apyChange24h.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-orange-500/20">
              <span 
                className="text-[8px] text-orange-500/50 font-mono uppercase"
                style={{ textShadow: '0 0 2px rgba(249, 115, 22, 0.3)' }}
              >
                DeFi Llama • Real-time
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); refresh(); }}
                disabled={loading}
                className="p-1 hover:bg-orange-500/10 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 text-orange-500/60 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* Minimized Info */}
        {isMinimized && yields.length > 0 && (
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 text-[9px] text-orange-500/60 font-mono">
              <TrendingUp className="w-3 h-3 text-orange-500" />
              <span style={{ textShadow: '0 0 4px rgba(249, 115, 22, 0.3)' }}>
                {yields[0]?.symbol} @ {yields[0]?.apy.toFixed(1)}% APY
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
