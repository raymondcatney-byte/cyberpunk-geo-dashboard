import { useState, useCallback, useEffect } from 'react';
import { useMarketSearch } from '../../hooks/useMarketSearch';
import { ScoreBreakdown } from './ScoreBreakdown';
import { Search, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';

const EXAMPLE_QUERIES = [
  'undervalued crypto markets',
  'geopolitics with volume spikes',
  'mispriced Fed rate cut bets',
  'high liquidity AI markets',
  'closing soon with good odds',
  'biotech with news divergence',
];

export function MarketSearch() {
  const { results, loading, error, intent, search, clear } = useMarketSearch();
  const [query, setQuery] = useState('');
  const [showExamples, setShowExamples] = useState(true);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      search(query);
      setShowExamples(false);
    }
  }, [query, search]);

  const handleExampleClick = useCallback((example: string) => {
    setQuery(example);
    search(example);
    setShowExamples(false);
  }, [search]);

  const handleClear = useCallback(() => {
    setQuery('');
    clear();
    setShowExamples(true);
  }, [clear]);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <form onSubmit={handleSearch} className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nerv-rust" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try: 'undervalued crypto with volume spikes'"
              className="w-full pl-10 pr-4 py-3 bg-nerv-void border border-nerv-brown text-nerv-amber placeholder-nerv-rust focus:border-nerv-orange focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-3 bg-nerv-orange-faint border border-nerv-orange text-nerv-orange hover:bg-nerv-orange/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </button>
          {results.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-3 border border-nerv-brown text-nerv-rust hover:border-nerv-orange hover:text-nerv-orange transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Intent Explanation */}
      {intent && (
        <div className="flex items-center gap-2 px-3 py-2 bg-nerv-orange/10 border border-nerv-orange/30">
          <Sparkles className="w-4 h-4 text-nerv-orange" />
          <span className="text-sm text-nerv-amber">
            {(() => {
              const { getIntentParser } = require('../../lib/intelligence/intent-parser');
              return getIntentParser().explainIntent(intent);
            })()}
          </span>
          <span className="ml-auto text-xs text-nerv-rust">
            {Math.round(intent.confidence)}% confidence
          </span>
        </div>
      )}

      {/* Example Queries */}
      {showExamples && (
        <div className="space-y-2">
          <span className="text-xs text-nerv-rust uppercase tracking-wider">
            Try these queries:
          </span>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example}
                onClick={() => handleExampleClick(example)}
                className="px-3 py-1.5 text-xs bg-nerv-void border border-nerv-brown text-nerv-amber hover:border-nerv-orange hover:text-nerv-orange transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-500/30 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="border border-nerv-brown bg-nerv-void-panel">
          {/* Results Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-nerv-brown bg-nerv-void">
            <span className="text-xs text-nerv-rust uppercase">
              {results.length} results found
            </span>
            <span className="text-xs text-nerv-rust">
              Sorted by relevance
            </span>
          </div>

          {/* Results List */}
          <div className="max-h-[500px] overflow-y-auto divide-y divide-nerv-brown/50">
            {results.map((result, index) => (
              <div
                key={result.market.id}
                className="p-4 hover:bg-nerv-orange/5 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-nerv-rust font-mono">
                        #{index + 1}
                      </span>
                      {result.market.category && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-nerv-orange/20 text-nerv-orange border border-nerv-orange/30">
                          {result.market.category}
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 bg-nerv-void border border-nerv-brown text-nerv-rust">
                        {result.intelligence.opportunityRating}
                      </span>
                    </div>
                    <h3 className="mt-1 text-sm font-medium text-nerv-amber">
                      {result.market.title}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-nerv-orange">
                      {result.intelligence.compositeScore}
                    </div>
                    <div className="text-xs text-nerv-rust">
                      Composite
                    </div>
                  </div>
                </div>

                {/* Scores */}
                <div className="mt-3">
                  <ScoreBreakdown intelligence={result.intelligence} compact />
                </div>

                {/* Match Reasons */}
                {result.matchReasons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {result.matchReasons.map((reason, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-1 bg-nerv-void border border-nerv-brown text-nerv-rust"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                )}

                {/* Market Details */}
                <div className="mt-3 flex items-center gap-4 text-xs text-nerv-rust">
                  <span>
                    YES: <span className="text-nerv-amber font-mono">{(result.market.yesPrice * 100).toFixed(1)}%</span>
                  </span>
                  <span>
                    NO: <span className="text-nerv-amber font-mono">{(result.market.noPrice * 100).toFixed(1)}%</span>
                  </span>
                  <span>
                    Vol: <span className="text-nerv-amber font-mono">${(result.market.volume / 1000000).toFixed(1)}M</span>
                  </span>
                  <span>
                    Liq: <span className="text-nerv-amber font-mono">${(result.market.liquidity / 1000000).toFixed(1)}M</span>
                  </span>
                  {result.market.endDate && (
                    <span>
                      Ends: <span className="text-nerv-amber">
                        {new Date(result.market.endDate).toLocaleDateString()}
                      </span>
                    </span>
                  )}
                </div>

                {/* Synthesis Summary */}
                {(result.synthesis.news.articles.length > 0 || result.synthesis.watchtower.relatedAlerts.length > 0) && (
                  <div className="mt-3 pt-3 border-t border-nerv-brown/50 flex items-center gap-4 text-xs">
                    {result.synthesis.news.articles.length > 0 && (
                      <span className="text-nerv-rust">
                        📰 {result.synthesis.news.articles.length} news articles
                        {result.synthesis.news.breakingAlert && (
                          <span className="ml-1 text-red-400">🚨 Breaking</span>
                        )}
                      </span>
                    )}
                    {result.synthesis.watchtower.relatedAlerts.length > 0 && (
                      <span className="text-nerv-rust">
                        🛡️ {result.synthesis.watchtower.relatedAlerts.length} watchtower alerts
                        {result.synthesis.watchtower.validationStatus === 'verified' && (
                          <span className="ml-1 text-green-400">✓ Verified</span>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && !showExamples && (
        <div className="text-center py-8 text-nerv-rust">
          No markets match your search criteria.
          <br />
          <button
            onClick={handleClear}
            className="mt-2 text-nerv-orange hover:underline"
          >
            Try a different query
          </button>
        </div>
      )}
    </div>
  );
}
