import { useState, useEffect, useCallback } from 'react';
import { History, TrendingUp, TrendingDown, Minus, ExternalLink, Target } from 'lucide-react';
import { CATEGORY_COLORS } from '../../config/polymarketWatchlist';

interface ResolvedMarket {
  slug: string;
  question: string;
  category: string;
  resolvedDate: string;
  outcome: 'YES' | 'NO' | 'CANCELLED' | 'UNKNOWN';
  finalPrice: number;
  url: string;
  userPrediction?: 'YES' | 'NO';
  userWasCorrect?: boolean;
}

export function HistoryPanel() {
  const [resolved, setResolved] = useState<ResolvedMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [accuracy, setAccuracy] = useState({ correct: 0, total: 0, percentage: 0 });

  const fetchResolvedMarkets = useCallback(async () => {
    setLoading(true);
    const history: ResolvedMarket[] = [];

    try {
      const res = await fetch('/api/polymarket/watchlist');
      const data = await res.json();
      const rows = Array.isArray(data?.markets) ? data.markets : [];
      rows.forEach((market: any) => {
        if (market.status !== 'resolved' && market.status !== 'closed') return;
        const outcome = String(market.outcome || 'UNKNOWN').toUpperCase() as ResolvedMarket['outcome'];
        const finalPrice = outcome === 'YES' ? 1 : outcome === 'NO' ? 0 : 0.5;
        history.push({
          slug: String(market.slug),
          question: String(market.question || market.slug),
          category: String(market.category || 'other'),
          resolvedDate: String(market.resolvedAt || market.endDate || new Date().toISOString()),
          outcome,
          finalPrice,
          url: String(market.url || `https://polymarket.com/event/${market.slug}`),
        });
      });
    } catch (err) {
      console.error('Failed to fetch resolved watchlist:', err);
    }

    // Sort by most recently resolved
    history.sort((a, b) => new Date(b.resolvedDate).getTime() - new Date(a.resolvedDate).getTime());
    setResolved(history);
    
    // Calculate accuracy if user tracked predictions
    const savedPredictions = localStorage.getItem('polymarket_predictions');
    if (savedPredictions) {
      try {
        const predictions: Record<string, 'YES' | 'NO'> = JSON.parse(savedPredictions);
        let correct = 0;
        let total = 0;
        
        history.forEach(m => {
          if (predictions[m.slug] && m.outcome !== 'CANCELLED' && m.outcome !== 'UNKNOWN') {
            total++;
            m.userPrediction = predictions[m.slug];
            m.userWasCorrect = predictions[m.slug] === m.outcome;
            if (m.userWasCorrect) correct++;
          }
        });
        
        setAccuracy({
          correct,
          total,
          percentage: total > 0 ? (correct / total) * 100 : 0
        });
      } catch {}
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchResolvedMarkets();
  }, [fetchResolvedMarkets]);

  const getOutcomeIcon = (outcome: string) => {
    if (outcome === 'YES') return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (outcome === 'NO') return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getOutcomeColor = (outcome: string) => {
    if (outcome === 'YES') return 'text-green-400';
    if (outcome === 'NO') return 'text-red-400';
    return 'text-gray-400';
  };

  if (loading && resolved.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-nerv-rust">
        <div className="w-8 h-8 border-2 border-nerv-orange border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-mono">Loading resolution history...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Accuracy Stats */}
      {accuracy.total > 0 && (
        <div className="p-4 border-b border-nerv-brown bg-nerv-void-panel">
          <h3 className="text-[10px] text-nerv-rust font-mono uppercase tracking-wider mb-3">
            Prediction Accuracy
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-nerv-void border border-nerv-brown rounded text-center">
              <div className="text-2xl font-mono text-nerv-amber">{accuracy.percentage.toFixed(1)}%</div>
              <div className="text-[9px] text-nerv-rust font-mono">Accuracy</div>
            </div>
            <div className="p-3 bg-nerv-void border border-nerv-brown rounded text-center">
              <div className="text-2xl font-mono text-data-green">{accuracy.correct}</div>
              <div className="text-[9px] text-nerv-rust font-mono">Correct</div>
            </div>
            <div className="p-3 bg-nerv-void border border-nerv-brown rounded text-center">
              <div className="text-2xl font-mono text-nerv-amber">{accuracy.total}</div>
              <div className="text-[9px] text-nerv-rust font-mono">Tracked</div>
            </div>
          </div>
        </div>
      )}

      {/* Resolved Markets List */}
      <div className="flex-1 overflow-y-auto">
        {resolved.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-nerv-rust p-8">
            <History className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm font-mono">No resolved markets yet</p>
            <p className="text-[10px] text-nerv-rust/60 mt-2 text-center">
              Markets from your watchlist will appear here once they resolve.
            </p>
          </div>
        ) : (
          resolved.map((market) => (
            <div
              key={market.slug}
              className="p-4 border-b border-nerv-brown/30 hover:bg-nerv-void-panel/50 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase"
                      style={{
                        backgroundColor: `${CATEGORY_COLORS[market.category]}20`,
                        color: CATEGORY_COLORS[market.category]
                      }}
                    >
                      {market.category}
                    </span>
                    <span className="text-[9px] text-nerv-rust/60 font-mono">
                      {new Date(market.resolvedDate).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-nerv-amber font-medium text-[13px] leading-snug">
                    {market.question}
                  </h3>
                </div>
                <a
                  href={market.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-nerv-rust hover:text-nerv-orange transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Outcome */}
              <div className="flex items-center justify-between p-3 bg-nerv-void rounded border border-nerv-brown/30">
                <div className="flex items-center gap-3">
                  {getOutcomeIcon(market.outcome)}
                  <div>
                    <div className={`text-lg font-mono font-bold ${getOutcomeColor(market.outcome)}`}>
                      {market.outcome}
                    </div>
                    <div className="text-[9px] text-nerv-rust font-mono">
                      Final: {(market.finalPrice * 100).toFixed(0)}¢
                    </div>
                  </div>
                </div>
                
                {/* User Prediction Result */}
                {market.userPrediction && (
                  <div className={`px-3 py-1.5 rounded border ${
                    market.userWasCorrect 
                      ? 'bg-green-500/20 border-green-500/50' 
                      : 'bg-red-500/20 border-red-500/50'
                  }`}>
                    <div className="text-[9px] text-nerv-rust font-mono">You predicted</div>
                    <div className={`text-sm font-mono font-bold ${
                      market.userWasCorrect ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {market.userWasCorrect ? '✓ ' : '✗ '}{market.userPrediction}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Note */}
      {resolved.length > 0 && (
        <div className="p-3 border-t border-nerv-brown bg-nerv-void-panel">
          <div className="flex items-start gap-2 text-[9px] text-nerv-rust/60 font-mono">
            <Target className="w-3.5 h-3.5 mt-0.5" />
            <span>
              Track your predictions by clicking "Add Position" in the Watchlist tab 
              before markets resolve. Your accuracy will be calculated automatically.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
