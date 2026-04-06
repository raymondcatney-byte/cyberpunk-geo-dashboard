import { useState } from 'react';
import { usePMFlow } from '../../hooks/usePMFlow';
import { UnusualFlowSignal } from '../../../lib/unusual-flow/types';

const severityStyles = {
  WHALE_ALERT: 'bg-purple-500/10 border-l-4 border-purple-500',
  SUSPICIOUS: 'bg-red-500/10 border-l-4 border-red-500',
  UNUSUAL: 'bg-orange-500/10 border-l-4 border-orange-500',
  NOTABLE: 'bg-cyan-500/10 border-l-4 border-cyan-500'
};

const severityBadgeStyles = {
  WHALE_ALERT: 'bg-purple-500/20 text-purple-300',
  SUSPICIOUS: 'bg-red-500/20 text-red-300',
  UNUSUAL: 'bg-orange-500/20 text-orange-300',
  NOTABLE: 'bg-cyan-500/20 text-cyan-300'
};

const typeLabels: Record<string, string> = {
  WHALE_ORDER: 'Whale',
  VOLUME_SPIKE: 'Volume',
  EXTREME_PROB: 'Extreme',
  FLOW_IMBALANCE: 'Imbalance',
  LATE_MONEY: 'Late Money'
};

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

interface FlowAlertCardProps {
  alert: UnusualFlowSignal;
}

function FlowAlertCard({ alert }: FlowAlertCardProps) {
  return (
    <div className={`p-3 ${severityStyles[alert.severity]} hover:bg-white/5 transition-colors border-b border-border`}>
      {/* Header: Type Badge + Time */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${severityBadgeStyles[alert.severity]}`}>
            {typeLabels[alert.type] || alert.type}
          </span>
          {alert.context.hoursToResolution < 24 && (
            <span className="text-[10px] text-yellow-400 font-mono">
              {Math.floor(alert.context.hoursToResolution)}h
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">{formatTimeAgo(alert.timestamp)}</span>
      </div>

      {/* Market Question */}
      <h3 className="text-xs text-foreground mb-2 line-clamp-2 leading-relaxed">
        {alert.marketQuestion}
      </h3>

      {/* Activity Row */}
      <div className="flex items-center gap-3 mb-2">
        <div className={`flex items-center gap-1 text-xs font-mono font-bold ${alert.side === 'YES' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {alert.side === 'YES' ? '▲' : '▼'} {alert.side}
        </div>
        <div className="text-foreground font-mono text-xs">
          ${alert.activity.size.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
        <div className="text-muted-foreground font-mono text-xs">
          @ {(alert.activity.price * 100).toFixed(0)}¢
        </div>
        {alert.activity.edge > 0.05 && (
          <div className="text-purple-400 text-[10px] font-mono">
            +{(alert.activity.edge * 100).toFixed(0)}%
          </div>
        )}
      </div>

      {/* Footer: Rationale + Smart Money Score */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground line-clamp-1 flex-1 pr-2">
          {alert.rationale}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-muted-foreground">SM:</span>
          <span className={`text-[10px] font-mono ${alert.context.smartMoneyScore > 75 ? 'text-purple-400' : 'text-muted-foreground'}`}>
            {alert.context.smartMoneyScore}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PMFlowPanel() {
  const [filter, setFilter] = useState<'ALL' | 'WHALE_ALERT' | 'SUSPICIOUS' | 'UNUSUAL'>('ALL');
  
  const { alerts, categories, count, isLoading, error } = usePMFlow({
    limit: 50,
    minSeverity: filter === 'ALL' ? 'NOTABLE' : filter,
    refreshInterval: 15000
  });

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="p-3 border-b border-border bg-card/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <h2 className="text-sm font-bold text-foreground tracking-wider">FLOW ALERTS</h2>
            <span className="text-[10px] text-muted-foreground">({count})</span>
          </div>
          
          {isLoading && (
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        
        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-1">
          {(['ALL', 'UNUSUAL', 'SUSPICIOUS', 'WHALE_ALERT'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                filter === f 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f === 'ALL' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="px-3 py-2 border-b border-border flex flex-wrap gap-1 overflow-hidden">
          {categories.slice(0, 4).map((cat: string) => (
            <span key={cat} className="px-1.5 py-0.5 text-[10px] bg-muted text-muted-foreground rounded">
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {error ? (
          <div className="p-6 text-center">
            <p className="text-xs text-destructive mb-1">Error loading flow</p>
            <p className="text-[10px] text-muted-foreground">{error}</p>
          </div>
        ) : isLoading && alerts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-muted-foreground">Scanning markets...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-xs text-muted-foreground">No unusual flow detected</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Markets operating normally</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {alerts.map((alert: UnusualFlowSignal) => (
              <FlowAlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PMFlowPanel;
