import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Send, Signal, TriangleAlert, TrendingUp } from 'lucide-react';

export type WatchtowerResult = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  region?: string;
  tags?: string[];
};

type QuoteItem = {
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
  timestamp: string;
  source: string;
};

type QuotesResponse = {
  ok: boolean;
  data?: QuoteItem[];
  errors?: { symbol: string; error: string }[];
};

function formatWhen(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    year: '2-digit',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function fmtPrice(symbol: string, price: number): string {
  const isCrypto = symbol === 'BTCUSD' || symbol === 'ETHUSD';
  if (isCrypto) return `$${Math.round(price).toLocaleString()}`;
  return `$${price.toFixed(2)}`;
}

export function WatchtowerConsole(props: {
  query: string;
  results: WatchtowerResult[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onLoadLatest: () => void;
  onSendToComms?: (text: string) => void;
}) {
  const { query, results, loading, error, onRefresh, onLoadLatest, onSendToComms } = props;

  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [quotesStatus, setQuotesStatus] = useState<'LIVE' | 'DEGRADED'>('DEGRADED');
  const [quotesLoading, setQuotesLoading] = useState(false);

  const symbols = useMemo(() => ['BTCUSD', 'ETHUSD', 'SPY', 'QQQ', 'NVDA', 'AAPL', 'TSLA'], []);
  const lastFetchedRef = useRef<number>(0);

  const fetchQuotes = async () => {
    setQuotesLoading(true);
    try {
      const res = await fetch(`/api/markets/quotes?symbols=${encodeURIComponent(symbols.join(','))}`);
      const data = (await res.json()) as QuotesResponse;
      if (!res.ok || !data.ok) throw new Error('UPSTREAM');
      const items = Array.isArray(data.data) ? data.data : [];
      setQuotes(items);
      setQuotesStatus(data.errors && data.errors.length > 0 ? 'DEGRADED' : 'LIVE');
      lastFetchedRef.current = Date.now();
    } catch {
      setQuotesStatus('DEGRADED');
    } finally {
      setQuotesLoading(false);
    }
  };

  // Load latest signals once on mount.
  useEffect(() => {
    onLoadLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll markets every 60s.
  useEffect(() => {
    void fetchQuotes();
    const t = window.setInterval(() => {
      void fetchQuotes();
    }, 60_000);
    return () => window.clearInterval(t);
  }, [symbols]);

  const status = loading
    ? 'FETCHING'
    : error
      ? 'DATA STREAM INTERRUPTED'
      : query.trim()
        ? results.length
          ? 'RESULTS'
          : 'NO MATCH'
        : results.length
          ? 'LATEST'
          : 'IDLE';

  return (
    <div className="h-full flex flex-col bg-nerv-void">
      <div className="p-4 border-b border-nerv-amber-dark">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Signal className="w-4 h-4 text-nerv-orange" />
              <h2 className="text-sm font-header font-medium text-nerv-orange uppercase tracking-wider">
                WATCHTOWER
              </h2>
            </div>
            <p className="mt-1 text-[10px] text-nerv-rust font-mono uppercase tracking-widest">
              OPEN-SOURCE SIGNAL AGGREGATION
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`text-[10px] px-2 py-1 border font-mono uppercase tracking-widest ${
                status === 'FETCHING'
                  ? 'border-nerv-orange bg-nerv-orange/5 text-nerv-orange'
                  : status === 'DATA STREAM INTERRUPTED'
                    ? 'border-nerv-alert/40 bg-nerv-alert/10 text-nerv-alert'
                    : status === 'RESULTS' || status === 'LATEST'
                      ? 'border-nerv-orange bg-nerv-orange/5 text-nerv-orange'
                      : 'border-nerv-brown bg-nerv-void-panel text-nerv-rust'
              }`}
            >
              {status}
            </div>
            <button
              type="button"
              onClick={() => {
                if (query.trim()) onRefresh();
                else onLoadLatest();
                void fetchQuotes();
              }}
              disabled={loading || quotesLoading}
              className="text-[10px] px-3 py-1 border border-nerv-orange bg-nerv-orange/5 text-nerv-orange hover:text-nerv-void hover:bg-nerv-orange transition-colors disabled:opacity-50 font-mono uppercase tracking-wider"
              title="Refresh"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-3 border border-nerv-amber-dark bg-nerv-void-panel p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-nerv-orange" />
              <div className="text-[10px] font-header uppercase tracking-widest text-nerv-orange">
                Global Markets
              </div>
            </div>
            <div className="text-[10px] font-mono text-nerv-amber-dim">
              MARKETS: <span className={quotesStatus === 'LIVE' ? 'text-nerv-orange' : 'text-nerv-alert'}>{quotesStatus}</span>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {symbols.map((sym) => {
              const q = quotes.find((x) => x.symbol === sym);
              const pct = q ? q.percentChange : null;
              const pctText = pct == null ? '--' : `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
              const pctClass =
                pct == null
                  ? 'text-nerv-rust'
                  : pct >= 0
                    ? 'text-nerv-amber'
                    : 'text-nerv-alert';
              return (
                <div key={sym} className="border border-nerv-brown bg-nerv-void-panel px-2 py-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-nerv-rust">
                    <span>{sym}</span>
                    <span className={pctClass}>{pctText}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-nerv-amber font-mono">
                    {q ? fmtPrice(sym, q.price) : '...'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-2 text-[10px] text-nerv-amber-dim font-mono">
            Try: sanctions, NVDA, FDA, cs.RO, stablecoin
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-mono text-nerv-amber-dim">
          <span className="truncate">QUERY: {query.trim() ? query : 'LATEST'} </span>
          <span>COUNT: {results.length}</span>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 border border-nerv-alert/30 bg-nerv-alert/10 px-3 py-2">
            <TriangleAlert className="w-4 h-4 text-nerv-alert mt-0.5" />
            <div>
              <div className="text-[10px] font-header uppercase tracking-widest text-nerv-alert">Alert</div>
              <div className="text-[11px] text-nerv-amber-dim leading-relaxed">{error}</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {loading ? (
          <div className="border border-nerv-amber/30 bg-nerv-void-panel p-4">
            <div className="text-[10px] font-header uppercase tracking-widest text-nerv-amber">Fetching</div>
            <div className="mt-2 text-[12px] text-nerv-amber-dim leading-relaxed">
              Pulling RSS signals. Expect partial results if some sources are degraded.
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="border border-nerv-amber-dark bg-nerv-void-panel p-4">
            <div className="text-[10px] font-header uppercase tracking-widest text-nerv-amber-dim">No Signals</div>
            <div className="mt-2 text-[12px] text-nerv-amber-dim leading-relaxed">
              No signals available. Refresh to retry.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <div
                key={r.id}
                className="border border-nerv-amber-dark bg-nerv-void-panel p-3 hover:border-nerv-amber transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[12px] text-nerv-orange leading-snug line-clamp-2">{r.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-nerv-rust">
                      <span className="text-nerv-rust">{r.source}</span>
                      {r.region && <span className="text-nerv-rust">REGION: {r.region.toUpperCase()}</span>}
                      {r.publishedAt && <span className="text-nerv-rust">{formatWhen(r.publishedAt)}</span>}
                    </div>
                    {r.tags && r.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {r.tags.slice(0, 8).map((t) => (
                          <span
                            key={t}
                            className="text-[9px] px-2 py-0.5 border border-nerv-brown bg-nerv-void-panel text-nerv-rust font-mono uppercase"
                          >
                            {t.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-3 py-1.5 border border-nerv-orange bg-nerv-orange/5 text-nerv-orange hover:bg-nerv-orange/20 transition-colors text-[11px] font-mono uppercase tracking-wider"
                      title="Open Source"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open
                    </a>

                    {onSendToComms && (
                      <button
                        type="button"
                        onClick={() => {
                          const prompt = [
                            'Assess and summarize this signal. Pull the hidden angle and recommend next moves.',
                            '',
                            `Title: ${r.title}`,
                            `Source: ${r.source}`,
                            `Link: ${r.url}`,
                          ].join('\n');
                          onSendToComms(prompt);
                        }}
                        className="inline-flex items-center justify-center gap-2 px-3 py-1.5 border border-nerv-orange bg-nerv-orange/5 text-nerv-orange hover:bg-nerv-orange/20 transition-colors text-[11px] font-mono uppercase tracking-wider"
                        title="Send to Comms"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Send
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-nerv-amber-dark text-[10px] text-nerv-amber-dim font-mono">
        Best-effort aggregation. Some sources may rate-limit or degrade.
      </div>
    </div>
  );
}
