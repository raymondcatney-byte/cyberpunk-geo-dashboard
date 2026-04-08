import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';

interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
  timestamp: string;
  source: string;
}

interface MarketDataCardProps {
  title: string;
  symbols: string[];
  icon?: 'stocks' | 'crypto' | 'commodities';
  allowSearch?: boolean;
  onStatusChange?: (status: { id: string; state: 'live' | 'degraded'; lastSuccess: string | null }) => void;
}

const ICONS = {
  stocks: Activity,
  crypto: DollarSign,
  commodities: TrendingUp,
};

const SYMBOL_LABELS: Record<string, string> = {
  'BTCUSD': 'Bitcoin',
  'ETHUSD': 'Ethereum',
  'SPY': 'S&P 500 ETF',
  'QQQ': 'Nasdaq ETF',
  'NVDA': 'NVIDIA',
  'AAPL': 'Apple',
  'TSLA': 'Tesla',
  'GC': 'Gold',
  'CL': 'Oil (WTI)',
};

export function MarketDataCard({ title, symbols, icon = 'stocks', allowSearch = false, onStatusChange }: MarketDataCardProps) {
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [status, setStatus] = useState<'live' | 'degraded'>('degraded');
  const [lastSuccess, setLastSuccess] = useState<string | null>(null);
  const [customSymbols, setCustomSymbols] = useState<string[]>([]);
  const [input, setInput] = useState<string>('');

  const Icon = ICONS[icon];
  const effectiveSymbols = useMemo(() => {
    const merged = [...symbols, ...customSymbols];
    return Array.from(new Set(merged.map((s) => s.toUpperCase())));
  }, [symbols, customSymbols]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/markets/quotes?symbols=${effectiveSymbols.join(',')}`);
      const data = await res.json();
      
      if (!data.ok) {
        throw new Error(data.error || 'Failed to fetch');
      }
      
      const nextRows = Array.isArray(data.data) ? (data.data as MarketQuote[]) : [];
      setQuotes((prev) => {
        const merged = new Map<string, MarketQuote>();
        for (const row of prev) merged.set(row.symbol, row);
        for (const row of nextRows) {
          if (row && typeof row.symbol === 'string') merged.set(row.symbol, row);
        }
        const ordered = effectiveSymbols.map((s) => merged.get(s)).filter(Boolean) as MarketQuote[];
        return ordered.length ? ordered : Array.from(merged.values());
      });
      const nowIso = new Date().toISOString();
      setLastUpdate(new Date(nowIso).toLocaleTimeString());
      setLastSuccess(nowIso);
      setStatus(data.errors && data.errors.length ? 'degraded' : 'live');
      onStatusChange?.({ id: title.toLowerCase(), state: data.errors && data.errors.length ? 'degraded' : 'live', lastSuccess: nowIso });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setStatus('degraded');
      onStatusChange?.({ id: title.toLowerCase(), state: 'degraded', lastSuccess });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [effectiveSymbols.join(',')]);

  const formatPrice = (symbol: string, price: number): string => {
    if (symbol === 'BTCUSD' || symbol === 'ETHUSD') {
      return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
    return `$${price.toFixed(2)}`;
  };

  const handleAddSymbol = () => {
    const next = input.trim().toUpperCase();
    if (!next) return;
    if (!/^[A-Z0-9.\-:]{1,15}$/.test(next)) return;
    if (!customSymbols.includes(next)) {
      setCustomSymbols((prev) => [...prev, next].slice(0, 10));
    }
    setInput('');
  };

  const handleRemoveSymbol = (symbol: string) => {
    setCustomSymbols((prev) => prev.filter((s) => s !== symbol));
  };

  const lastSuccessLabel = lastSuccess ? new Date(lastSuccess).toLocaleTimeString() : '';

  return (
    <div className="nerv-panel border border-[var(--steel-faint)]">
      <div className="nerv-panel-header">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--nerv-orange)]" />
          <span className="nerv-panel-title">{title}</span>
        </div>
        <span className="nerv-label">
          {status === 'live' ? 'LIVE' : 'DEGRADED'} {lastSuccessLabel ? `| ${lastSuccessLabel}` : ''}
        </span>
      </div>
      
      <div className="nerv-panel-content">
        {allowSearch && (
          <div className="mb-3 space-y-2">
            <div className="space-y-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Add ticker (e.g., MSFT)"
                className="nerv-input h-8 w-full text-[11px]"
              />
              <button type="button" className="nerv-button h-8 w-full text-[10px]" onClick={handleAddSymbol}>
                Add
              </button>
            </div>
            {customSymbols.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {customSymbols.map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    className="border border-[var(--steel-faint)] bg-[var(--void-panel)] px-2 py-1 text-[10px] text-[var(--steel)]"
                    onClick={() => handleRemoveSymbol(symbol)}
                    title="Remove"
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {loading && quotes.length === 0 ? (
          <div className="py-4 text-center">
            <div className="inline-block w-4 h-4 border-2 border-[var(--steel-faint)] border-t-[var(--nerv-orange)] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {error && (
              <div className="py-1 text-center text-[10px] text-[var(--alert-red)]">
                {error}
              </div>
            )}
            {quotes.map((quote) => {
              const isPositive = quote.percentChange >= 0;
              const TrendIcon = isPositive ? TrendingUp : TrendingDown;
              
              return (
                <div 
                  key={quote.symbol}
                  className="flex items-center justify-between p-2 border border-[var(--steel-faint)] bg-[var(--void-panel)]"
                >
                  <div>
                    <div className="text-[11px] font-medium text-[var(--steel)]">
                      {SYMBOL_LABELS[quote.symbol] || quote.symbol}
                    </div>
                    <div className="text-[10px] text-[var(--steel-dim)]">
                      {quote.symbol}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-[12px] font-mono text-[var(--steel)]">
                      {formatPrice(quote.symbol, quote.price)}
                    </div>
                    <div className={`flex items-center gap-1 text-[10px] ${
                      isPositive ? 'text-[var(--data-green)]' : 'text-[var(--alert-red)]'
                    }`}>
                      <TrendIcon className="w-3 h-3" />
                      <span>
                        {isPositive ? '+' : ''}{quote.percentChange.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {quotes.length === 0 && (
              <div className="py-4 text-center text-[11px] text-[var(--steel-dim)]">
                No data available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
