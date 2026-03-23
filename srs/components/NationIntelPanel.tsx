import { ArrowLeft, Newspaper, TrendingUp, Globe } from 'lucide-react';
import type { Market } from '../hooks/useEvents';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  timestamp: string;
  url?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface NationIntelPanelProps {
  country: string;
  countryCode: string;
  news: NewsItem[];
  markets: Market[];
  onBack: () => void;
}

const SEVERITY_COLORS = {
  critical: 'text-nerv-alert border-nerv-alert/40 bg-nerv-alert/10',
  high: 'text-nerv-amber border-nerv-amber/40 bg-nerv-amber/10',
  medium: 'text-nerv-amber border-nerv-amber-bright/40 bg-nerv-amber/5',
  low: 'text-nerv-rust border-nerv-brown bg-nerv-void-panel'
};

export function NationIntelPanel({ country, countryCode, news, markets, onBack }: NationIntelPanelProps) {
  const formatTime = (ts: string) => {
    const date = new Date(ts);
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'now';
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const formatCurrency = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 bg-nerv-void-panel border border-nerv-brown">
        <button
          onClick={onBack}
          className="p-1 hover:bg-nerv-orange/10 text-nerv-rust hover:text-nerv-orange transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Globe className="w-4 h-4 text-nerv-orange" />
        <span className="text-[12px] font-mono uppercase text-nerv-orange">{country}</span>
        <span className="text-[10px] text-nerv-rust font-mono">({countryCode})</span>
      </div>

      {/* News Section */}
      <div className="p-3 bg-nerv-void-panel border border-nerv-brown">
        <div className="flex items-center gap-2 mb-2">
          <Newspaper className="w-3 h-3 text-nerv-amber" />
          <span className="text-[10px] font-mono uppercase text-nerv-rust">Intel Feed</span>
          <span className="text-[9px] text-nerv-amber font-mono">{news.length}</span>
        </div>
        
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {news.slice(0, 10).map((item) => (
            <div
              key={item.id}
              className={`p-2 border-l-2 ${SEVERITY_COLORS[item.severity]}`}
            >
              <div className="flex items-center gap-1 text-[9px] text-nerv-rust mb-1">
                <span>{item.source}</span>
                <span>·</span>
                <span>{formatTime(item.timestamp)}</span>
              </div>
              <p className="text-[10px] text-nerv-amber line-clamp-2">{item.title}</p>
            </div>
          ))}
          {news.length === 0 && (
            <div className="text-[10px] text-nerv-rust text-center py-4 font-mono">
              No recent intelligence
            </div>
          )}
        </div>
      </div>

      {/* Markets Section */}
      <div className="p-3 bg-nerv-void-panel border border-nerv-brown">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-3 h-3 text-nerv-orange" />
          <span className="text-[10px] font-mono uppercase text-nerv-rust">Markets</span>
          <span className="text-[9px] text-nerv-orange font-mono">{markets.length}</span>
        </div>
        
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {markets.slice(0, 8).map((market) => (
            <a
              key={market.id}
              href={market.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-2 border border-nerv-brown hover:border-nerv-orange/50 transition-colors"
            >
              <p className="text-[10px] text-nerv-amber line-clamp-2 mb-1">{market.question}</p>
              <div className="flex items-center gap-3 text-[9px] text-nerv-rust font-mono">
                <span>YES: {(market.yesPrice * 100).toFixed(1)}%</span>
                <span>VOL: {formatCurrency(market.volume)}</span>
              </div>
            </a>
          ))}
          {markets.length === 0 && (
            <div className="text-[10px] text-nerv-rust text-center py-4 font-mono">
              No active markets
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
