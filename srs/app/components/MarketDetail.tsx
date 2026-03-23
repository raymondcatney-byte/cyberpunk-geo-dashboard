import { useState, useEffect } from 'react';
import { X, ExternalLink, TrendingUp, Activity, DollarSign, Calendar, Tag, Info } from 'lucide-react';
import { getPolymarketMarketDetail, type PolymarketMarketResult, type PolymarketMarketDetail } from '../lib/polymarket';

interface MarketDetailProps {
  market: PolymarketMarketResult;
  onClose: () => void;
}

export function MarketDetail({ market, onClose }: MarketDetailProps) {
  const [detail, setDetail] = useState<PolymarketMarketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchDetail() {
      setLoading(true);
      setError(null);
      try {
        const data = await getPolymarketMarketDetail(
          market.id,
          market.slug
        );
        if (!cancelled) setDetail(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load market details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDetail();
    return () => { cancelled = true; };
  }, [market.id, market.slug]);

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatProbability = (price: number) => `${(price * 100).toFixed(1)}%`;

  const statusColor = {
    active: 'text-green-400',
    closed: 'text-amber-400',
    resolved: 'text-blue-400',
    cancelled: 'text-red-400',
  };

  const displayData = detail || {
    ...market,
    description: 'Loading description...',
    tags: [],
    status: 'active' as const,
    volume: 0,
    liquidity: 0,
    spread: 0,
    createdAt: '',
    resolutionSource: undefined,
    outcomes: [],
    outcomePrices: [],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] bg-[#0a0a0a] border border-[#262626] rounded-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#262626] bg-[#111111]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-semibold text-white">Market Intel</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#262626] transition-colors"
          >
            <X className="w-5 h-5 text-[#737373] hover:text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded bg-red-900/20 border border-red-500/30">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Question */}
          <div>
            <h2 className="text-lg font-medium text-white leading-relaxed">
              {displayData.question}
            </h2>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium uppercase tracking-wider ${statusColor[displayData.status]}`}>
              {displayData.status}
            </span>
            {detail?.category && (
              <>
                <span className="text-[#525252]">•</span>
                <span className="text-xs text-[#737373]">{detail.category}</span>
              </>
            )}
          </div>

          {/* Price Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded bg-[#111111] border border-[#262626]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
                <span className="text-[10px] uppercase tracking-wider text-[#737373]">YES</span>
              </div>
              <div className="text-2xl font-mono font-semibold text-green-400">
                {formatProbability(displayData.yesPrice ?? 0)}
              </div>
              <div className="text-[10px] text-[#525252]">Probability</div>
            </div>

            <div className="p-3 rounded bg-[#111111] border border-[#262626]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <span className="text-[10px] uppercase tracking-wider text-[#737373]">NO</span>
              </div>
              <div className="text-2xl font-mono font-semibold text-red-400">
                {formatProbability(displayData.noPrice ?? 0)}
              </div>
              <div className="text-[10px] text-[#525252]">Probability</div>
            </div>
          </div>

          {/* Market Stats */}
          {detail && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded bg-[#111111] border border-[#262626]">
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[10px] uppercase tracking-wider text-[#737373]">Volume</span>
                </div>
                <div className="text-sm font-mono text-white">{formatCurrency(detail.volume)}</div>
              </div>

              <div className="p-3 rounded bg-[#111111] border border-[#262626]">
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] uppercase tracking-wider text-[#737373]">Liquidity</span>
                </div>
                <div className="text-sm font-mono text-white">{formatCurrency(detail.liquidity)}</div>
              </div>

              <div className="p-3 rounded bg-[#111111] border border-[#262626]">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] uppercase tracking-wider text-[#737373]">Spread</span>
                </div>
                <div className="text-sm font-mono text-white">{(detail.spread * 100).toFixed(2)}¢</div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="p-4 rounded bg-[#111111] border border-[#262626]">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-[#737373]" />
              <span className="text-xs font-medium text-[#a3a3a3]">Description</span>
            </div>
            <p className="text-sm text-[#a3a3a3] leading-relaxed whitespace-pre-wrap">
              {displayData.description}
            </p>
          </div>

          {/* Additional Details */}
          {detail && (
            <div className="space-y-3">
              {/* End Date */}
              {detail.endDate && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-[#737373]" />
                  <span className="text-[#737373]">Resolves:</span>
                  <span className="text-white">
                    {new Date(detail.endDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}

              {/* Tags */}
              {detail.tags.length > 0 && (
                <div className="flex items-start gap-2">
                  <Tag className="w-4 h-4 text-[#737373] mt-0.5" />
                  <div className="flex flex-wrap gap-2">
                    {detail.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-[10px] bg-[#1a1a1a] text-[#737373] border border-[#262626]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution Source */}
              {detail.resolutionSource && (
                <div className="text-sm">
                  <span className="text-[#737373]">Resolution Source: </span>
                  <span className="text-[#a3a3a3]">{detail.resolutionSource}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#262626] bg-[#111111]">
          <a
            href={market.url || 'https://polymarket.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors"
          >
            <span>View on Polymarket</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
