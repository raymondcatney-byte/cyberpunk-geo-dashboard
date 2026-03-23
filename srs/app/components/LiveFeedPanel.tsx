import { Newspaper, ExternalLink, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useLiveFeed } from '../hooks/useWorldMonitor';

interface LiveFeedPanelProps {
  enabled?: boolean;
  limit?: number;
  priorityItem?: { title: string; source: string; url?: string } | null;
}

const SEVERITY_COLORS = {
  critical: 'text-nerv-alert border-nerv-alert/40 bg-nerv-alert/5',
  high: 'text-nerv-amber border-nerv-amber/40 bg-nerv-amber-faint',
  medium: 'text-nerv-amber border-nerv-amber-bright/40 bg-nerv-amber-faint',
  low: 'text-nerv-rust border-nerv-amber-dark bg-nerv-void-panel',
};

const CATEGORY_ICONS: Record<string, string> = {
  geopolitics: '🌐',
  military: '⚔️',
  markets: '📈',
  crypto: '₿',
  energy: '⚡',
  infrastructure: '🏗️',
  ai: '🤖',
  biotech: '🧬',
  robotics: '🦾',
};

export function LiveFeedPanel({ enabled = true, limit = 10, priorityItem }: LiveFeedPanelProps) {
  const { items, loading, refresh, source } = useLiveFeed(enabled, limit);

  if (!enabled) return null;

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return new Date(timestamp).toLocaleDateString();
  };

  const isLive = source === 'api';

  return (
    <div className="p-4 bg-nerv-void-panel border border-nerv-brown">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[11px] font-mono uppercase tracking-wider text-nerv-orange flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-nerv-orange" />
          Live Feed
        </h4>
        <div className="flex items-center gap-2">
          {/* Source indicator */}
          <div className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono uppercase ${isLive ? 'bg-nerv-amber-faint border border-nerv-orange/40 text-nerv-orange' : 'bg-nerv-amber-faint border border-nerv-amber/40 text-nerv-rust'}`}>
            {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isLive ? 'LIVE' : 'CACHED'}
          </div>
          <span className="text-[9px] text-nerv-rust font-mono">{items.length} items</span>
          <button
            onClick={refresh}
            disabled={loading}
            className="p-1 hover:bg-nerv-orange/10 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 text-nerv-rust ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
        {/* Priority Item from Watchtower */}
        {priorityItem && (
          <div className="p-2 border-l-2 border-nerv-alert bg-nerv-alert/5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[9px] px-1 bg-nerv-alert text-nerv-void font-mono">PRIORITY</span>
              <span className="text-[9px] text-nerv-rust uppercase font-mono">{priorityItem.source}</span>
            </div>
            <p className="text-[10px] text-nerv-amber font-mono leading-snug line-clamp-2">
              {priorityItem.title}
            </p>
            {priorityItem.url && (
              <a
                href={priorityItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1 text-[9px] text-nerv-rust hover:text-nerv-orange"
              >
                <ExternalLink className="w-3 h-3" />
                View
              </a>
            )}
          </div>
        )}
        
        {items.map((item) => (
          <div
            key={item.id}
            className={`p-2 border-l-2 ${SEVERITY_COLORS[item.severity]} hover:bg-white/5 transition-colors`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px]">{CATEGORY_ICONS[item.category] || '📰'}</span>
                  <span className="text-[9px] text-nerv-rust uppercase tracking-wider truncate font-mono">
                    {item.source}
                  </span>
                  <span className="text-[9px] text-nerv-rust">·</span>
                  <span className="text-[9px] text-nerv-rust font-mono">
                    {formatTime(item.timestamp)}
                  </span>
                </div>
                <p className="text-[10px] text-nerv-amber font-mono leading-snug line-clamp-2 font-mono">
                  {item.title}
                </p>
                {item.country && (
                  <span className="inline-block mt-1 px-1.5 py-0.5 text-[8px] bg-nerv-void-panel border border-nerv-brown text-nerv-rust font-mono uppercase">
                    {item.country}
                  </span>
                )}
              </div>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 p-1 hover:bg-white/10"
                >
                  <ExternalLink className="w-3 h-3 text-nerv-rust" />
                </a>
              )}
            </div>
          </div>
        ))}

        {items.length === 0 && !loading && (
          <div className="text-[10px] text-nerv-rust text-center py-4 font-mono">
            No recent intelligence
          </div>
        )}
      </div>
    </div>
  );
}
