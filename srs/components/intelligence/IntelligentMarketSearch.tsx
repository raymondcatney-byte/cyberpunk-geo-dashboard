import { useState } from 'react';
import { useEvents, CATEGORIES, type Category } from '../../hooks/useEvents';
import { Search, RefreshCw, ExternalLink, AlertCircle, X } from 'lucide-react';

export function IntelligentMarketSearch() {
  const { 
    masterMarkets,
    activeCategory, 
    displayedMarkets,
    searchResults,
    loading, 
    error, 
    hasLoaded, 
    isSearching,
    fetchMasterMarkets, 
    fetchCategory,
    setActiveCategory,
    search, 
    clearSearch,
    getCategoryCount
  } = useEvents();
  
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    void search(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setQuery('');
    clearSearch();
  };

  const handleLoadData = () => {
    void fetchMasterMarkets();
  };

  const handleCategoryClick = (category: Category | 'ALL') => {
    setActiveCategory(category);
    const q = query.trim();
    if (category === 'ALL') {
      if (q) void search(q);
      else void fetchMasterMarkets();
      return;
    }
    if (q) void search(q);
    else void fetchCategory(category);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Ended';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 30) return `${days}d`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatCategoryLabel = (cat: string) => {
    if (cat === 'ENERGY_COMMODITIES') return 'ENERGY/COMM';
    return cat;
  };

  // Determine what to show
  const showResults = isSearching || activeCategory !== 'ALL';
  const resultsToShow = isSearching ? searchResults : displayedMarkets;
  const showNullState = isSearching && searchResults.length === 0 && hasLoaded;
  const totalMarkets = Object.values(masterMarkets).flat().length;

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nerv-rust" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasLoaded ? "Search signals..." : "Load data first..."}
              disabled={!hasLoaded || loading}
              className="w-full pl-10 pr-10 py-2.5 bg-nerv-void border border-nerv-brown text-nerv-amber placeholder-nerv-rust focus:border-nerv-orange focus:outline-none text-sm disabled:opacity-50"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-nerv-rust hover:text-nerv-orange"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {!hasLoaded ? (
            <button
              onClick={handleLoadData}
              disabled={loading}
              className="px-4 py-2.5 bg-nerv-orange-faint border border-nerv-orange text-nerv-orange hover:bg-nerv-orange/20 disabled:opacity-50 text-sm font-mono"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'LOAD DATA'}
            </button>
          ) : (
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="px-4 py-2.5 bg-nerv-orange-faint border border-nerv-orange text-nerv-orange hover:bg-nerv-orange/20 disabled:opacity-50 text-sm font-mono"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'SCAN'}
            </button>
          )}
          
          {hasLoaded && (
            <button
              onClick={handleClear}
              className="px-3 py-2.5 border border-nerv-brown text-nerv-rust hover:border-nerv-orange text-sm"
            >
              CLEAR
            </button>
          )}
        </div>

        {/* Category Filter Stack (clickable even before LOAD DATA) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleCategoryClick('ALL')}
            className={`px-2 py-1 text-[10px] border font-mono uppercase transition-colors ${
              activeCategory === 'ALL'
                ? 'bg-nerv-orange-faint border-nerv-orange text-nerv-orange'
                : 'border-nerv-brown text-nerv-rust hover:border-nerv-orange'
            }`}
          >
            ALL ({totalMarkets})
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`px-2 py-1 text-[10px] border font-mono uppercase transition-colors ${
                activeCategory === cat
                  ? 'bg-nerv-orange-faint border-nerv-orange text-nerv-orange'
                  : 'border-nerv-brown text-nerv-rust hover:border-nerv-orange'
              }`}
            >
              {formatCategoryLabel(cat)} ({getCategoryCount(cat)})
            </button>
          ))}
        </div>

        {/* Status */}
        {hasLoaded && (
          <div className="text-[10px] text-nerv-rust font-mono">
            {isSearching ? (
              <span>SEARCH: "{query}" | RESULTS: {searchResults.length}</span>
            ) : activeCategory !== 'ALL' ? (
              <span>ACTIVE STACK: {formatCategoryLabel(activeCategory)} | SIGNALS: {displayedMarkets.length}</span>
            ) : (
              <span>ALL CATEGORIES LOADED | TOTAL SIGNALS: {totalMarkets}</span>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-500/30 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* NULL STATE - No relevant threats detected */}
      {showNullState && (
        <div className="text-center py-8 border border-nerv-alert/30 bg-nerv-alert/10">
          <div className="text-nerv-alert text-sm font-mono">[SYSTEM ERROR: NO RELEVANT THREATS DETECTED]</div>
          <button onClick={handleClear} className="mt-2 text-[10px] text-nerv-rust hover:text-nerv-orange underline">
            CLEAR SEARCH
          </button>
        </div>
      )}

      {/* Results */}
      {showResults && resultsToShow.length > 0 && (
        <div className="border border-nerv-brown bg-nerv-void-panel max-h-[400px] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-nerv-brown bg-nerv-void sticky top-0">
            <span className="text-[11px] text-nerv-rust uppercase font-mono">
              {isSearching ? `${searchResults.length} MATCHES` : `${displayedMarkets.length} SIGNALS`}
            </span>
            {activeCategory !== 'ALL' && !isSearching && (
              <span className="text-[10px] text-nerv-orange font-mono">{formatCategoryLabel(activeCategory)}</span>
            )}
            {isSearching && (
              <span className="text-[10px] text-nerv-orange font-mono">SEARCH: "{query}"</span>
            )}
          </div>

          {/* List */}
          <div className="divide-y divide-nerv-brown/50">
            {resultsToShow.map((market, index) => (
              <div
                key={market.id}
                className="p-3 hover:bg-nerv-orange/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-nerv-rust font-mono">#{index + 1}</span>
                      {market.category && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-nerv-orange/20 text-nerv-orange border border-nerv-orange/30 font-mono">
                          {formatCategoryLabel(market.category)}
                        </span>
                      )}
                    </div>
                    <h4 className="mt-1 text-xs text-nerv-amber line-clamp-2">
                      {market.question}
                    </h4>
                  </div>
                </div>

                {/* Price & Volume */}
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] text-nerv-rust font-mono">
                    <span>
                      YES: <span className="text-nerv-amber">{(market.yesPrice * 100).toFixed(1)}%</span>
                    </span>
                    <span>
                      VOL: <span className="text-nerv-amber">{formatCurrency(market.volume)}</span>
                    </span>
                    <span>
                      LIQ: <span className="text-nerv-amber">{formatCurrency(market.liquidity)}</span>
                    </span>
                    <span>
                      ENDS: <span className="text-nerv-amber">{formatDate(market.endDate)}</span>
                    </span>
                  </div>

                  {market.url && (
                    <a
                      href={market.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 text-[10px] bg-nerv-orange-faint border border-nerv-orange text-nerv-orange hover:bg-nerv-orange/20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      VIEW
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Initial State - Load data */}
      {!hasLoaded && !loading && (
        <div className="text-center py-8 text-nerv-rust text-sm border border-nerv-brown bg-nerv-void-panel font-mono">
          CLICK LOAD DATA TO INITIATE SIGNAL ACQUISITION
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 text-nerv-orange text-sm border border-nerv-brown bg-nerv-void-panel font-mono">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          ACQUIRING SIGNALS...
        </div>
      )}
    </div>
  );
}
