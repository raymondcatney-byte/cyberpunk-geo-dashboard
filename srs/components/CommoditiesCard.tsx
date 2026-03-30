import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Droplets, CircleDollarSign } from 'lucide-react';

interface CommodityQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  percentChange: number;
}

type QuoteApiRow = {
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
};

function emptyCommodity(symbol: 'GOLD' | 'OIL'): CommodityQuote {
  return symbol === 'GOLD'
    ? { symbol: 'GOLD', name: 'Gold', price: 0, change: 0, percentChange: 0 }
    : { symbol: 'OIL', name: 'Oil (WTI)', price: 0, change: 0, percentChange: 0 };
}

export function CommoditiesCard() {
  const [quotes, setQuotes] = useState<CommodityQuote[]>([emptyCommodity('GOLD'), emptyCommodity('OIL')]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);

    try {
      const res = await fetch('/api/markets/quotes?symbols=GC,CL', { headers: { Accept: 'application/json' } });
      const data = await res.json().catch(() => null) as { ok?: boolean; data?: QuoteApiRow[] } | null;
      if (!res.ok || !data || data.ok !== true) throw new Error('UPSTREAM');

      const rows = Array.isArray(data.data) ? data.data : [];
      const goldRow = rows.find((row) => row && row.symbol === 'GC');
      const oilRow = rows.find((row) => row && row.symbol === 'CL');

      setQuotes((prev) => {
        const nextGold: CommodityQuote = goldRow
          ? { symbol: 'GOLD', name: 'Gold', price: goldRow.price, change: goldRow.change, percentChange: goldRow.percentChange }
          : (prev.find((q) => q.symbol === 'GOLD') ?? emptyCommodity('GOLD'));

        const nextOil: CommodityQuote = oilRow
          ? { symbol: 'OIL', name: 'Oil (WTI)', price: oilRow.price, change: oilRow.change, percentChange: oilRow.percentChange }
          : (prev.find((q) => q.symbol === 'OIL') ?? emptyCommodity('OIL'));

        return [nextGold, nextOil];
      });

      setLastUpdate(new Date().toLocaleTimeString());
    } catch {
      // Keep last-known-good quotes on failure.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (quote: CommodityQuote): string => {
    if (quote.symbol === 'GOLD') {
      return `$${quote.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
    return `$${quote.price.toFixed(2)}`;
  };

  return (
    <div className="nerv-panel border border-[var(--steel-faint)]">
      <div className="nerv-panel-header">
        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4 text-[var(--wire-cyan)]" />
          <span className="nerv-panel-title">Commodities</span>
        </div>
        <span className="nerv-label">{lastUpdate || 'LIVE'}</span>
      </div>
      
      <div className="nerv-panel-content">
        {loading ? (
          <div className="py-4 text-center">
            <div className="inline-block w-4 h-4 border-2 border-[var(--steel-faint)] border-t-[var(--wire-cyan)] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {quotes.map((quote) => {
              const isPositive = quote.percentChange >= 0;
              const TrendIcon = isPositive ? TrendingUp : TrendingDown;
              const Icon = quote.symbol === 'OIL' ? Droplets : CircleDollarSign;
              
              return (
                <div 
                  key={quote.symbol}
                  className="flex items-center justify-between p-2 border border-[var(--steel-faint)] bg-[var(--void-panel)]"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[var(--steel-dim)]" />
                    <div>
                      <div className="text-[11px] font-medium text-[var(--steel)]">
                        {quote.name}
                      </div>
                      <div className="text-[10px] text-[var(--steel-dim)]">
                        {quote.symbol}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-[12px] font-mono text-[var(--steel)]">
                      {quote.price > 0 ? formatPrice(quote) : 'N/A'}
                    </div>
                    {quote.price > 0 && (
                      <div className={`flex items-center gap-1 text-[10px] ${
                        isPositive ? 'text-[var(--data-green)]' : 'text-[var(--alert-red)]'
                      }`}>
                        <TrendIcon className="w-3 h-3" />
                        <span>
                          {isPositive ? '+' : ''}{quote.percentChange.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
