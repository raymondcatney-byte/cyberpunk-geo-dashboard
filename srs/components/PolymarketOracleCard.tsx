import { useState, useEffect, useMemo } from 'react';
import { Activity, ChevronUp, ChevronDown, TrendingUp, RefreshCw, Target, AlertTriangle } from 'lucide-react';
import { usePolymarketData } from '../hooks/useDeFiData';
import { useAnomalies } from '../hooks/useAnomalies';

interface PolymarketOracleCardProps {
  enabled?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  onSignalClick?: (lat: number, lng: number, label: string) => void;
}

const GEO_ZONES: Record<string, { lat: number; lng: number; label: string }> = {
  'ukraine': { lat: 48.5, lng: 31.0, label: 'UKRAINE' },
  'russia': { lat: 61.5, lng: 105.0, label: 'RUSSIA' },
  'china': { lat: 35.0, lng: 104.0, label: 'CHINA' },
  'taiwan': { lat: 23.5, lng: 121.0, label: 'TAIWAN' },
  'israel': { lat: 31.0, lng: 34.8, label: 'ISRAEL' },
  'gaza': { lat: 31.5, lng: 34.5, label: 'GAZA' },
  'iran': { lat: 32.0, lng: 53.0, label: 'IRAN' },
  'korea': { lat: 36.0, lng: 128.0, label: 'KOREA' },
  'election': { lat: 38.9, lng: -77.0, label: 'USA' },
  'trump': { lat: 38.9, lng: -77.0, label: 'USA' },
  'biden': { lat: 38.9, lng: -77.0, label: 'USA' },
};

function findGeo(title: string) {
  const lower = title.toLowerCase();
  for (const [k, v] of Object.entries(GEO_ZONES)) {
    if (lower.includes(k)) return v;
  }
  return null;
}

export function PolymarketOracleCard({ enabled = true, position = 'top-right', onSignalClick }: PolymarketOracleCardProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'signals' | 'anomalies'>('signals');
  const { events, loading: signalsLoading, refresh: refreshSignals } = usePolymarketData(enabled);
  const { anomalies, loading: anomaliesLoading, fetchAnomalies, lastScan } = useAnomalies();

  // Auto-refresh signals every 60s (existing behavior)
  useEffect(() => {
    if (!enabled) return;
    const i = setInterval(refreshSignals, 60000);
    return () => clearInterval(i);
  }, [enabled, refreshSignals]);

  // Combined refresh handler
  const handleRefresh = () => {
    refreshSignals();
    fetchAnomalies();
  };

  const maxVol = useMemo(() => Math.max(...events.map(e => e.volume), 1), [events]);

  if (!enabled) return null;

  const pos = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  }[position];

  const isLoading = signalsLoading || anomaliesLoading;

  return (
    <div className={`absolute ${pos} z-40 pointer-events-auto w-[320px]`}>
      <div className="bg-black/90 backdrop-blur-md border border-purple-500/30 overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.2)]">
        {/* Header with Tabs */}
        <div className="flex items-center justify-between p-3 bg-purple-500/10 border-b border-purple-500/30">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="text-[11px] font-mono font-bold text-purple-400 uppercase tracking-wider">Signal Stack</span>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && <RefreshCw className="w-3 h-3 text-purple-400 animate-spin" />}
            <button onClick={() => setIsMinimized(!isMinimized)} className="hover:bg-purple-500/10 p-1 rounded">
              {isMinimized ? <ChevronUp className="w-4 h-4 text-purple-400/60" /> : <ChevronDown className="w-4 h-4 text-purple-400/60" />}
            </button>
          </div>
        </div>

        {/* Tabs */}
        {!isMinimized && (
          <div className="flex border-b border-purple-500/20">
            <button
              onClick={() => setActiveTab('signals')}
              className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                activeTab === 'signals' 
                  ? 'bg-purple-500/20 text-purple-300 border-b-2 border-purple-400' 
                  : 'text-purple-400/50 hover:text-purple-400/80'
              }`}
            >
              All Signals ({events.length})
            </button>
            <button
              onClick={() => setActiveTab('anomalies')}
              className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-wider transition-colors flex items-center justify-center gap-1 ${
                activeTab === 'anomalies' 
                  ? 'bg-orange-500/20 text-orange-300 border-b-2 border-orange-400' 
                  : 'text-orange-400/50 hover:text-orange-400/80'
              }`}
            >
              🔥 Anomalies ({anomalies.length})
            </button>
          </div>
        )}

        {/* Content */}
        {!isMinimized && (
          <div className="p-3">
            {activeTab === 'signals' ? (
              /* Signals Tab */
              <div className="space-y-2 max-h-[240px] overflow-y-auto scrollbar-thin">
                {events.slice(0, 8).map((event) => {
                  const loc = findGeo(event.title);
                  const intensity = event.volume / maxVol;
                  const yesPct = Math.round(event.yesPrice * 100);
                  return (
                    <div key={event.id} className="p-2.5 bg-black border border-purple-500/20 hover:border-purple-500/50 transition-all cursor-pointer group" onClick={() => loc && onSignalClick?.(loc.lat, loc.lng, loc.label)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[9px] text-purple-300/90 line-clamp-2 font-mono leading-tight">{event.title}</div>
                        {loc && <Target className="w-3 h-3 text-purple-400/60 group-hover:text-purple-400 transition-colors flex-shrink-0 mt-0.5" />}
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[9px] font-mono text-purple-400/80">{yesPct}% YES</span>
                        <span className="text-[8px] font-mono text-purple-400/50">${(event.volume / 1000000).toFixed(1)}M VOL</span>
                      </div>
                      <div className="h-[2px] mt-1.5 bg-purple-500/10 overflow-hidden rounded-full">
                        <div className="h-full bg-purple-400 transition-all duration-700 rounded-full" style={{ width: `${Math.max(intensity * 100, 5)}%`, boxShadow: `0 0 ${intensity * 10}px rgba(168, 85, 247, ${intensity * 0.8})`, opacity: 0.5 + (intensity * 0.5) }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Anomalies Tab */
              <div className="space-y-2 max-h-[240px] overflow-y-auto scrollbar-thin">
                {anomalies.length === 0 && !anomaliesLoading && (
                  <div className="p-4 text-center">
                    <p className="text-[10px] text-purple-400/50 font-mono">No anomalies detected</p>
                    <p className="text-[8px] text-purple-400/30 font-mono mt-1">Click refresh to scan</p>
                  </div>
                )}
                {anomalies.map((anomaly) => {
                  const loc = findGeo(anomaly.title);
                  const isHighScore = anomaly.score >= 70;
                  return (
                    <div 
                      key={anomaly.id} 
                      className={`p-2.5 bg-black border transition-all cursor-pointer group ${
                        isHighScore 
                          ? 'border-orange-500/60 shadow-[0_0_15px_rgba(249,115,22,0.2)]' 
                          : 'border-orange-500/20 hover:border-orange-500/50'
                      }`}
                      onClick={() => loc && onSignalClick?.(loc.lat, loc.lng, loc.label)}
                    >
                      {/* Score badge */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-mono text-orange-400 uppercase tracking-wider">🔥 {anomaly.sector}</span>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${isHighScore ? 'bg-orange-500/30 text-orange-300' : 'bg-orange-500/10 text-orange-400/70'}`}>
                            {anomaly.score}/100
                          </span>
                        </div>
                        {loc && <Target className="w-3 h-3 text-orange-400/60 group-hover:text-orange-400 transition-colors" />}
                      </div>
                      
                      {/* Title */}
                      <div className="text-[9px] text-orange-300/90 line-clamp-2 font-mono leading-tight mb-1.5">
                        {anomaly.title}
                      </div>
                      
                      {/* Signals */}
                      <div className="flex items-center gap-2 text-[8px] font-mono text-orange-400/70 mb-1">
                        {anomaly.signals.map((signal, i) => (
                          <span key={i} className="bg-orange-500/10 px-1.5 py-0.5 rounded">{signal}</span>
                        ))}
                      </div>
                      
                      {/* Price & Volume */}
                      <div className="flex items-center justify-between text-[8px] font-mono">
                        <span className="text-orange-400/80">${anomaly.price.toFixed(2)}</span>
                        <span className="text-orange-400/50">${(anomaly.volume / 1000000).toFixed(1)}M</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer with Refresh */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-purple-500/20">
              <span className="text-[8px] text-purple-400/50 font-mono uppercase">
                {activeTab === 'anomalies' && lastScan 
                  ? `Last scan: ${new Date(lastScan).toLocaleTimeString()}` 
                  : 'Live Feed 60s Refresh'}
              </span>
              <button 
                onClick={handleRefresh} 
                disabled={isLoading}
                className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded transition-colors"
              >
                <RefreshCw className={`w-3 h-3 text-purple-400 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="text-[8px] font-mono text-purple-400 uppercase">
                  {activeTab === 'anomalies' ? 'Scan' : 'Refresh'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Minimized Info */}
        {isMinimized && events.length > 0 && (
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 text-[9px] text-purple-400/60 font-mono">
              <TrendingUp className="w-3 h-3 text-purple-400" />
              <span className="truncate">{events[0]?.title.slice(0, 35)}...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
