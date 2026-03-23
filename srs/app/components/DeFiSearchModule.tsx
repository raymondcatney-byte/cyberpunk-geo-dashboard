import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Loader2,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useDeFiData, useProtocolSentiment } from '../hooks/useDeFiData';

const QUICK_SELECT_PROTOCOLS = [
  { slug: 'uniswap', name: 'Uniswap' },
  { slug: 'aave', name: 'Aave' },
  { slug: 'lido', name: 'Lido' },
  { slug: 'curve-dex', name: 'Curve' },
  { slug: 'bitcoin', name: 'Bitcoin' },
  { slug: 'ethereum', name: 'Ethereum' },
];

interface DeFiSearchModuleProps {
  className?: string;
}

export function DeFiSearchModule({ className }: DeFiSearchModuleProps) {
  const [searchInput, setSearchInput] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const { data, loading, error, refresh } = useDeFiData(selectedProtocol);
  const sentiment = useProtocolSentiment(data?.protocol.name || '');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.trim().length > 1) setSelectedProtocol(searchInput.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSelectProtocol = useCallback((slug: string) => {
    setSelectedProtocol(slug);
    const protocol = QUICK_SELECT_PROTOCOLS.find((item) => item.slug === slug);
    if (protocol) setSearchInput(protocol.name);
  }, []);

  const formatCurrency = (value: number, decimals = 2) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(decimals)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(decimals)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(decimals)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(decimals)}K`;
    return `$${value.toFixed(decimals)}`;
  };

  return (
    <div className={`nerv-panel overflow-hidden ${className || ''}`}>
      <button
        type="button"
        className="w-full flex items-center justify-between p-3 bg-[var(--wire-cyan-faint)] border-b border-[var(--wire-cyan-dim)]"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[var(--wire-cyan)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--wire-cyan)]">DeFi Intelligence</span>
        </div>
        <div className="flex items-center gap-2">
          {data && data.alerts.length > 0 && <span className="w-2 h-2 rounded-full bg-[var(--alert-red)] animate-pulse" />}
          <span className={`text-xs text-[var(--steel-dim)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {isExpanded && (
        <div className="p-3 space-y-3">
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search protocol..."
              className="nerv-input w-full pl-9 pr-9 text-xs uppercase"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && searchInput.trim()) {
                  setSelectedProtocol(searchInput.trim().toLowerCase());
                }
                if (event.key === 'Escape') {
                  setSearchInput('');
                  setSelectedProtocol('');
                }
              }}
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--steel-dim)]" />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSelectedProtocol('');
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--steel-dim)] hover:text-[var(--steel)]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {QUICK_SELECT_PROTOCOLS.map((protocol) => (
              <button
                type="button"
                key={protocol.slug}
                onClick={() => handleSelectProtocol(protocol.slug)}
                className={`px-2 py-1 text-[10px] border uppercase tracking-[0.12em] transition-all ${
                  selectedProtocol === protocol.slug
                    ? 'bg-[var(--wire-cyan-faint)] border-[var(--wire-cyan-dim)] text-[var(--wire-cyan)]'
                    : 'bg-[var(--void-panel)] border-[var(--steel-faint)] text-[var(--steel-dim)] hover:border-[var(--wire-cyan-dim)]'
                }`}
              >
                {protocol.name}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="flex items-center gap-2 text-[var(--wire-cyan)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-mono uppercase">Analyzing...</span>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="p-3 bg-[var(--alert-red-faint)] border border-[var(--alert-red-dim)]">
              <div className="flex items-center gap-2 text-[var(--alert-red)] text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Protocol intel unavailable</span>
              </div>
            </div>
          )}

          {data && !loading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--steel-faint)]">
                <div>
                  <div className="text-sm font-bold text-[var(--steel)]">{data.protocol.name}</div>
                  <div className="text-[10px] text-[var(--steel-dim)] font-mono">{data.protocol.symbol}</div>
                </div>
                <button
                  type="button"
                  onClick={() => refresh()}
                  className="p-1.5 text-[var(--steel-dim)] hover:text-[var(--wire-cyan)] transition-colors"
                  title="Refresh data"
                >
                  <Activity className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <MetricCard
                  label="TVL"
                  value={formatCurrency(data.protocol.tvl, 2)}
                  change={data.protocol.tvl_change_24h}
                  trend={data.protocol.tvl_change_24h >= 0 ? 'up' : 'down'}
                />
                <MetricCard
                  label="Price"
                  value={data.token ? `$${data.token.current_price.toFixed(2)}` : 'N/A'}
                  change={data.token?.price_change_24h}
                  trend={data.token ? (data.token.price_change_24h >= 0 ? 'up' : 'down') : 'neutral'}
                />
                <MetricCard
                  label="Fees (24h)"
                  value={formatCurrency(data.protocol.fees_24h, 2)}
                  subtext={data.ratios.fees_tvl ? `${(data.ratios.fees_tvl * 100).toFixed(2)}% run-rate` : undefined}
                  trend="neutral"
                />
                <div className={`p-2 border ${
                  sentiment?.label === 'bullish' ? 'bg-[var(--data-green-faint)] border-[var(--data-green-dim)]' :
                  sentiment?.label === 'bearish' ? 'bg-[var(--alert-red-faint)] border-[var(--alert-red-dim)]' :
                  'bg-[var(--void-panel)] border-[var(--steel-faint)]'
                }`}>
                  <div className="text-[9px] uppercase tracking-wider text-[var(--steel-dim)] mb-1">Sentiment</div>
                  <div className={`text-sm font-bold ${
                    sentiment?.label === 'bullish' ? 'text-[var(--data-green)]' :
                    sentiment?.label === 'bearish' ? 'text-[var(--alert-red)]' :
                    'text-[var(--steel)]'
                  }`}>
                    {sentiment ? sentiment.label.toUpperCase() : 'LOADING'}
                  </div>
                  <div className="text-[10px] text-[var(--steel-dim)]">{sentiment ? `${sentiment.confidence}% confidence` : 'Awaiting signal'}</div>
                </div>
              </div>

              {data.ratios.mcap_tvl && (
                <div className="flex items-center justify-between p-2 bg-[var(--void-panel)] border border-[var(--steel-faint)]">
                  <span className="text-[10px] text-[var(--steel-dim)] uppercase tracking-[0.12em]">Mkt Cap / TVL</span>
                  <span className={`text-xs font-mono font-bold ${
                    data.ratios.mcap_tvl < 1 ? 'text-[var(--data-green)]' :
                    data.ratios.mcap_tvl > 3 ? 'text-[var(--alert-red)]' :
                    'text-[var(--nerv-orange)]'
                  }`}>
                    {data.ratios.mcap_tvl.toFixed(2)}x
                  </span>
                </div>
              )}

              {data.alerts.length > 0 && (
                <div className="space-y-1">
                  {data.alerts.map((alert) => (
                    <div key={alert} className="flex items-center gap-2 p-2 bg-[var(--alert-red-faint)] border border-[var(--alert-red-dim)]">
                      <AlertTriangle className="w-3 h-3 text-[var(--alert-red)] flex-shrink-0" />
                      <span className="text-[10px] text-[var(--steel)]">{alert}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!selectedProtocol && !loading && !error && (
            <div className="text-center py-4 text-[var(--steel-dim)]">
              <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-[10px] uppercase tracking-[0.12em]">Select a protocol to analyze</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  change?: number;
  subtext?: string;
  trend: 'up' | 'down' | 'neutral';
}

function MetricCard({ label, value, change, subtext, trend }: MetricCardProps) {
  return (
    <div className="p-2 bg-[var(--void-panel)] border border-[var(--steel-faint)]">
      <div className="text-[9px] uppercase tracking-wider text-[var(--steel-dim)] mb-1">{label}</div>
      <div className="text-sm font-bold text-[var(--steel)] font-mono">{value}</div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-[10px] ${
          trend === 'up' ? 'text-[var(--data-green)]' :
          trend === 'down' ? 'text-[var(--alert-red)]' :
          'text-[var(--steel-dim)]'
        }`}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
          <span>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</span>
        </div>
      )}
      {subtext && <div className="text-[9px] text-[var(--wire-cyan)]">{subtext}</div>}
    </div>
  );
}