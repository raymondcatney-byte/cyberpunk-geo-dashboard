/**
 * Polymarket Monitor Component
 * Displays live market data with NERV-style formatting
 */

import { useState, useMemo } from 'react';
import { usePolymarketMonitor } from '../../hooks/usePolymarketMonitor';
import { MONITORED_MARKETS } from '../../config/polymarketMonitor';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  RefreshCw, 
  Bell,
  ExternalLink,
  Clock,
  AlertTriangle,
  Zap,
  BarChart3,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Severity colors matching NERV theme
const SEVERITY_COLORS = {
  critical: { bg: '#C9302C', text: '#fff', border: '#C9302C' },
  high: { bg: '#E8A03C', text: '#000', border: '#E8A03C' },
  medium: { bg: '#FF9800', text: '#000', border: '#FF9800' },
  low: { bg: '#5C3A1E', text: '#C9A050', border: '#5C3A1E' }
};

const CATEGORY_COLORS: Record<string, string> = {
  geopolitics: '#ef4444',
  crypto: '#f59e0b',
  economy: '#10b981',
  ai: '#a855f7',
  biotech: '#06b6d4',
  tech: '#ec4899',
  other: '#666666'
};

export function PolymarketMonitor() {
  const { 
    markets, 
    alerts, 
    events, 
    loading, 
    error, 
    lastUpdated, 
    refresh, 
    autoRefresh, 
    toggleAutoRefresh,
    getRecentAlerts 
  } = usePolymarketMonitor(MONITORED_MARKETS);

  const [expandedMarket, setExpandedMarket] = useState<string | null>(null);
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);

  // Get recent alerts (last 24 hours)
  const recentAlerts = useMemo(() => getRecentAlerts(24 * 60), [getRecentAlerts]);

  // Filter markets if showing alerts only
  const displayedMarkets = useMemo(() => {
    if (showAlertsOnly) {
      return markets.filter(m => m.alert);
    }
    return markets;
  }, [markets, showAlertsOnly]);

  // Sort by severity (alerts first)
  const sortedMarkets = useMemo(() => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...displayedMarkets].sort((a, b) => {
      const aSeverity = a.alert?.severity || severityOrder[a.changes.trend === 'surging' || a.changes.trend === 'crashing' ? 'high' : 'low'];
      const bSeverity = b.alert?.severity || severityOrder[b.changes.trend === 'surging' || b.changes.trend === 'crashing' ? 'high' : 'low'];
      return (severityOrder[aSeverity as keyof typeof severityOrder] || 4) - (severityOrder[bSeverity as keyof typeof severityOrder] || 4);
    });
  }, [displayedMarkets]);

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'surging':
      case 'rising':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'falling':
      case 'crashing':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Activity className="w-4 h-4 text-nerv-rust" />;
    }
  };

  const getTrendClass = (trend: string) => {
    switch (trend) {
      case 'surging':
        return 'text-green-400 font-bold';
      case 'rising':
        return 'text-green-400';
      case 'falling':
        return 'text-red-400';
      case 'crashing':
        return 'text-red-400 font-bold';
      default:
        return 'text-nerv-rust';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-nerv-brown bg-nerv-void-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-nerv-orange" />
            <h2 className="text-white font-mono font-semibold text-sm">Polymarket Monitor</h2>
            <span className="text-nerv-rust text-xs">({markets.length} markets)</span>
          </div>
          <div className="flex items-center gap-2">
            {recentAlerts.length > 0 && (
              <button
                onClick={() => setShowAlertsOnly(!showAlertsOnly)}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-mono rounded border transition-all ${
                  showAlertsOnly 
                    ? 'bg-nerv-orange/20 border-nerv-orange text-nerv-orange' 
                    : 'border-nerv-brown text-nerv-rust hover:border-nerv-orange'
                }`}
              >
                <Bell className="w-3 h-3" />
                {recentAlerts.length} Alerts
              </button>
            )}
            <button
              onClick={toggleAutoRefresh}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-mono rounded border transition-all ${
                autoRefresh 
                  ? 'bg-nerv-orange/20 border-nerv-orange text-nerv-orange' 
                  : 'border-nerv-brown text-nerv-rust hover:border-nerv-orange'
              }`}
            >
              <Clock className="w-3 h-3" />
              {autoRefresh ? 'Auto' : 'Manual'}
            </button>
            <button
              onClick={refresh}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1 text-xs font-mono bg-nerv-orange text-white rounded hover:bg-nerv-orange/80 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        <p className="text-nerv-rust text-[11px] mt-1">
          Live monitoring of {MONITORED_MARKETS.length} markets • Last updated: {formatTime(lastUpdated)}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && markets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-nerv-rust">
            <div className="w-8 h-8 border-2 border-nerv-orange border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-mono">Fetching market data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-nerv-rust px-8">
            <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
            <p className="text-sm font-mono">{error}</p>
            <button 
              onClick={refresh}
              className="mt-3 px-3 py-1 text-xs border border-nerv-orange text-nerv-orange hover:bg-nerv-orange/20 rounded"
            >
              Retry
            </button>
          </div>
        ) : sortedMarkets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-nerv-rust">
            <p className="text-sm font-mono">
              {showAlertsOnly ? 'No active alerts' : 'No markets found'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-nerv-brown/30">
            {sortedMarkets.map((market) => {
              const isExpanded = expandedMarket === market.id;
              const hasAlert = !!market.alert;
              const severity = market.alert?.severity || 
                (market.changes.trend === 'surging' || market.changes.trend === 'crashing' ? 'high' : 'low');
              const colors = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS];

              return (
                <div 
                  key={market.id}
                  className={`p-4 hover:bg-nerv-void-panel/50 transition-colors ${
                    hasAlert ? 'bg-nerv-orange/5' : ''
                  }`}
                >
                  {/* Main Row */}
                  <div 
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => setExpandedMarket(isExpanded ? null : market.id)}
                  >
                    {/* Alert Indicator */}
                    {hasAlert && (
                      <div 
                        className="w-1 h-full min-h-[40px] rounded-full"
                        style={{ backgroundColor: colors.border }}
                      />
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header Row */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {/* Category Badge */}
                        <span 
                          className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase"
                          style={{ 
                            backgroundColor: `${CATEGORY_COLORS[market.category]}20`,
                            color: CATEGORY_COLORS[market.category]
                          }}
                        >
                          {market.category}
                        </span>

                        {/* Alert Badge */}
                        {hasAlert && (
                          <span 
                            className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase flex items-center gap-1"
                            style={{ 
                              backgroundColor: colors.bg,
                              color: colors.text
                            }}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {market.alert?.type}
                          </span>
                        )}

                        {/* Trend Badge */}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase flex items-center gap-1 border border-nerv-brown ${getTrendClass(market.changes.trend)}`}>
                          {getTrendIcon(market.changes.trend)}
                          {market.changes.trend}
                        </span>
                      </div>

                      {/* Market Name */}
                      <h3 className="text-nerv-amber font-medium text-[13px] leading-snug mb-2">
                        {market.name}
                      </h3>

                      {/* Prices */}
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="p-2 bg-nerv-void rounded border border-nerv-brown/30">
                          <div className="text-[8px] text-nerv-rust font-mono mb-1">YES</div>
                          <div className="font-mono text-green-400">{market.priceYes}</div>
                        </div>
                        <div className="p-2 bg-nerv-void rounded border border-nerv-brown/30">
                          <div className="text-[8px] text-nerv-rust font-mono mb-1">NO</div>
                          <div className="font-mono text-red-400">{market.priceNo}</div>
                        </div>
                        <div className="p-2 bg-nerv-void rounded border border-nerv-brown/30">
                          <div className="text-[8px] text-nerv-rust font-mono mb-1">1H</div>
                          <div className={`font-mono ${market.changes['1h'] && market.changes['1h'] > 0 ? 'text-green-400' : market.changes['1h'] && market.changes['1h'] < 0 ? 'text-red-400' : 'text-nerv-rust'}`}>
                            {market.changes['1h'] !== null 
                              ? `${market.changes['1h'] > 0 ? '+' : ''}${(market.changes['1h'] * 100).toFixed(1)}%`
                              : '--'
                            }
                          </div>
                        </div>
                        <div className="p-2 bg-nerv-void rounded border border-nerv-brown/30">
                          <div className="text-[8px] text-nerv-rust font-mono mb-1">24H</div>
                          <div className={`font-mono ${market.changes['24h'] && market.changes['24h'] > 0 ? 'text-green-400' : market.changes['24h'] && market.changes['24h'] < 0 ? 'text-red-400' : 'text-nerv-rust'}`}>
                            {market.changes['24h'] !== null 
                              ? `${market.changes['24h'] > 0 ? '+' : ''}${(market.changes['24h'] * 100).toFixed(1)}%`
                              : '--'
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expand Icon */}
                    <div className="text-nerv-rust">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-nerv-brown/30 pl-4">
                      {/* Alert Message */}
                      {market.alert && (
                        <div 
                          className="mb-3 p-2 rounded text-xs font-mono"
                          style={{ 
                            backgroundColor: `${colors.bg}20`,
                            border: `1px solid ${colors.border}`
                          }}
                        >
                          <div className="flex items-center gap-1 mb-1" style={{ color: colors.border }}>
                            <Zap className="w-3 h-3" />
                            <span className="uppercase">{market.alert.severity} Alert</span>
                          </div>
                          <p style={{ color: colors.text }}>{market.alert.message}</p>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
                        <div>
                          <span className="text-nerv-rust">Volume: </span>
                          <span className="text-nerv-amber">${(market.volume / 1000000).toFixed(2)}M</span>
                        </div>
                        <div>
                          <span className="text-nerv-rust">Liquidity: </span>
                          <span className="text-nerv-amber">${(market.liquidity / 1000000).toFixed(2)}M</span>
                        </div>
                      </div>

                      {/* Action Links */}
                      <div className="flex gap-2">
                        <a 
                          href={market.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-nerv-orange border border-nerv-orange/50 rounded hover:bg-nerv-orange/20 transition-all"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open on Polymarket
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-nerv-brown bg-nerv-void-panel flex justify-between items-center text-[10px] text-nerv-rust font-mono">
        <span>
          {loading ? 'Updating...' : `${markets.length} markets monitored`}
        </span>
        <span>
          {recentAlerts.length > 0 && `${recentAlerts.length} alerts (24h) • `}
          Updated {formatTime(lastUpdated)}
        </span>
      </div>
    </div>
  );
}
