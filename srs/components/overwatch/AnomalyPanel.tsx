import { useState, useEffect, useCallback, useMemo } from 'react';
import { TOPIC_KEYS, type TopicKey } from '../../config/anomalyTopics';
import { POLYMARKET_WATCHLIST, CATEGORY_COLORS } from '../../config/polymarketWatchlist';
import { WatchlistPanel } from './WatchlistPanel';
import { ResolvingPanel } from './ResolvingPanel';
import { ArbitragePanel } from './ArbitragePanel';
import { HistoryPanel } from './HistoryPanel';
import { searchMarkets, expandSearchTerm, TOPICS, type SearchResult } from '../../lib/polymarket-search';
import { Activity, Package, Clock, GitCompare, History, ExternalLink, Search, X, Sparkles } from 'lucide-react';

interface Anomaly {
  question: string;
  topic: TopicKey | 'other';
  detectedPrice: number;
  peakPrice: number;
  nowPrice: number;
  change: string;
  volume: number;
  direction: 'up' | 'down';
  slug: string;
  detectedAt: number;
  movedAt: number;
}

interface WatchlistMarketData {
  slug: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  category: string;
  endDate: string;
}

const TOPIC_COLORS: Record<TopicKey | 'other', string> = {
  geopolitics: '#ef4444',
  ai: '#a855f7',
  crypto: '#f59e0b',
  economy: '#10b981',
  finance: '#3b82f6',
  science: '#06b6d4',
  tech: '#ec4899',
  other: '#666666'
};

type FilterTopic = TopicKey | 'other' | 'all';
type ViewTab = 'markets' | 'watchlist' | 'resolving' | 'arbitrage' | 'history';

export function AnomalyPanel() {
  const [activeView, setActiveView] = useState<ViewTab>('markets');
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [watchlistMarkets, setWatchlistMarkets] = useState<WatchlistMarketData[]>([]);
  const [activeTopics, setActiveTopics] = useState<FilterTopic[]>(['all']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('--:--:--');
  
  // Smart Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'standard' | 'smart'>('smart');
  
  const topics: FilterTopic[] = ['all', ...TOPIC_KEYS, 'other'];

  // Perform search
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) {
      return watchlistMarkets.map(m => ({ ...m, _searchScore: 1, _matchedTopics: [], _matchedKeywords: [] }));
    }
    
    if (searchMode === 'smart') {
      return searchMarkets(watchlistMarkets, searchTerm, 50);
    } else {
      // Standard search - simple substring match
      const term = searchTerm.toLowerCase();
      return watchlistMarkets
        .filter(m => 
          m.question.toLowerCase().includes(term) || 
          m.slug.toLowerCase().includes(term)
        )
        .map(m => ({ ...m, _searchScore: 1, _matchedTopics: [], _matchedKeywords: [] }));
    }
  }, [watchlistMarkets, searchTerm, searchMode]);

  // Filter by active topics
  const filteredResults = useMemo(() => {
    if (activeTopics.includes('all')) return searchResults;
    return searchResults.filter(r => 
      activeTopics.includes(r.category as FilterTopic) ||
      r._matchedTopics?.some(t => activeTopics.includes(t.topic as FilterTopic))
    );
  }, [searchResults, activeTopics]);

  // Fetch general anomalies (for potential future use)
  const fetchAnomalies = async () => {
    try {
      const res = await fetch('/api/polymarket');
      const data = await res.json();
      setAnomalies(data.anomalies || []);
    } catch (e) {
      console.error('Failed to fetch anomalies:', e);
    }
  };

  // Fetch user's watchlist markets via our API (avoids CORS)
  const fetchWatchlistMarkets = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/polymarket/watchlist');
      const data = await res.json();
      
      if (data.markets && Array.isArray(data.markets)) {
        // Enrich with category info from our config
        const enrichedMarkets = data.markets.map((m: any) => {
          const config = POLYMARKET_WATCHLIST.find(w => w.slug === m.slug);
          return {
            ...m,
            category: config?.category || 'other',
          };
        });
        setWatchlistMarkets(enrichedMarkets);
      } else {
        setError('No markets returned from API');
      }
      
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch watchlist:', err);
      setError('Failed to fetch markets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlistMarkets();
    const interval = setInterval(fetchWatchlistMarkets, 30000);
    return () => clearInterval(interval);
  }, [fetchWatchlistMarkets]);

  const toggleTopic = (topic: FilterTopic) => {
    if (topic === 'all') {
      setActiveTopics(['all']);
    } else {
      const newTopics = activeTopics.includes(topic)
        ? activeTopics.filter(t => t !== topic)
        : [...activeTopics.filter(t => t !== 'all'), topic];
      setActiveTopics(newTopics.length === 0 ? ['all'] : newTopics);
    }
  };

  const filteredAnomalies = activeTopics.includes('all')
    ? anomalies
    : anomalies.filter(a => activeTopics.includes(a.topic as FilterTopic));

  const formatTime = (ms: number) => {
    const diff = Date.now() - ms;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m ago`;
    return `${minutes}m ago`;
  };

  const formatVolume = (v: number) => {
    return v > 1000 ? `${(v / 1000).toFixed(1)}K` : v.toString();
  };

  const viewTabs: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
    { id: 'markets', label: 'Markets', icon: <Activity className="w-4 h-4" /> },
    { id: 'watchlist', label: 'Watchlist', icon: <Package className="w-4 h-4" /> },
    { id: 'resolving', label: 'Resolving', icon: <Clock className="w-4 h-4" /> },
    { id: 'arbitrage', label: 'Arbitrage', icon: <GitCompare className="w-4 h-4" /> },
    { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div className="flex-1 flex flex-col bg-nerv-void h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-nerv-brown bg-nerv-void-panel">
        <h2 className="text-white font-mono font-semibold text-sm mb-1">Polymarket Command Center</h2>
        <p className="text-nerv-rust text-[11px]">Advanced market monitoring, arbitrage detection, and resolution tracking</p>
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-nerv-brown bg-nerv-void-panel overflow-x-auto">
        {viewTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-3 text-[11px] font-mono uppercase tracking-wider transition-all whitespace-nowrap
              ${activeView === tab.id
                ? 'bg-nerv-orange/20 border-b-2 border-nerv-orange text-nerv-orange'
                : 'text-nerv-rust hover:text-nerv-orange hover:bg-nerv-orange/5'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Based on Active View */}
      {activeView === 'markets' && (
        <div className="flex-1 flex">
          {/* LEFT SIDEBAR - Smart Search */}
          <div className="w-80 border-r border-nerv-brown bg-nerv-void-panel flex flex-col">
            {/* Search Header */}
            <div className="p-4 border-b border-nerv-brown">
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-4 h-4 text-nerv-orange" />
                <h3 className="text-nerv-amber font-mono text-sm">Market Search</h3>
              </div>
              
              {/* Search Input */}
              <div className="relative mb-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search markets..."
                  className="w-full bg-nerv-void border border-nerv-brown rounded px-3 py-2 text-sm text-nerv-amber placeholder-nerv-rust/50 focus:outline-none focus:border-nerv-orange"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-nerv-rust hover:text-nerv-amber"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Search Mode Toggle */}
              <div className="flex gap-1">
                <button
                  onClick={() => setSearchMode('standard')}
                  className={`flex-1 py-1.5 text-[10px] font-mono uppercase transition-all ${
                    searchMode === 'standard'
                      ? 'bg-nerv-orange/20 text-nerv-orange border border-nerv-orange'
                      : 'bg-nerv-void text-nerv-rust border border-nerv-brown hover:border-nerv-orange/50'
                  }`}
                >
                  Standard
                </button>
                <button
                  onClick={() => setSearchMode('smart')}
                  className={`flex-1 py-1.5 text-[10px] font-mono uppercase transition-all flex items-center justify-center gap-1 ${
                    searchMode === 'smart'
                      ? 'bg-nerv-orange/20 text-nerv-orange border border-nerv-orange'
                      : 'bg-nerv-void text-nerv-rust border border-nerv-brown hover:border-nerv-orange/50'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Smart
                </button>
              </div>
            </div>

            {/* Search Stats */}
            <div className="p-3 border-b border-nerv-brown bg-nerv-void/50">
              <div className="text-[10px] text-nerv-rust font-mono mb-2">
                Results: <span className="text-nerv-amber">{filteredResults.length}</span>
              </div>
              
              {searchTerm && searchMode === 'smart' && (
                <div className="space-y-2">
                  <div className="text-[9px] text-nerv-rust uppercase tracking-wider">Matched Topics</div>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(new Set(filteredResults.flatMap(r => r._matchedTopics?.map(t => t.topic) || []))).map(topic => (
                      <span key={topic} className="text-[9px] px-1.5 py-0.5 bg-nerv-orange/10 text-nerv-orange border border-nerv-orange/30 rounded">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Topic Filters */}
            <div className="p-3 border-b border-nerv-brown flex-1 overflow-y-auto">
              <div className="text-[9px] text-nerv-rust uppercase tracking-wider mb-2">Filter by Topic</div>
              <div className="flex flex-wrap gap-1">
                {(['all', ...Object.keys(TOPICS)] as FilterTopic[]).map(topic => (
                  <button
                    key={topic}
                    onClick={() => {
                      if (topic === 'all') {
                        setActiveTopics(['all']);
                      } else {
                        const newTopics = activeTopics.includes(topic)
                          ? activeTopics.filter(t => t !== topic)
                          : [...activeTopics.filter(t => t !== 'all'), topic];
                        setActiveTopics(newTopics.length === 0 ? ['all'] : newTopics);
                      }
                    }}
                    className={`px-2 py-1 text-[9px] font-mono uppercase rounded border transition-all ${
                      activeTopics.includes(topic)
                        ? 'bg-nerv-orange/20 border-nerv-orange text-nerv-orange'
                        : 'bg-transparent border-nerv-brown text-nerv-rust hover:border-nerv-orange/50'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>

              {/* Matched Keywords */}
              {searchTerm && searchMode === 'smart' && filteredResults.length > 0 && (
                <div className="mt-4">
                  <div className="text-[9px] text-nerv-rust uppercase tracking-wider mb-2">Top Keywords</div>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(new Set(filteredResults.flatMap(r => r._matchedKeywords || [])))
                      .slice(0, 8)
                      .map(keyword => (
                        <span key={keyword} className="text-[9px] px-1.5 py-0.5 bg-nerv-void text-nerv-rust border border-nerv-brown rounded">
                          {keyword}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-nerv-brown">
              <button
                onClick={() => { setSearchTerm(''); setActiveTopics(['all']); }}
                className="w-full py-2 text-[10px] font-mono uppercase text-nerv-rust border border-nerv-brown hover:border-nerv-orange hover:text-nerv-orange transition-all"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* MAIN CONTENT - Markets List */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Category Filters */}
            <div className="flex gap-2 px-4 py-2 border-b border-nerv-brown bg-nerv-void-panel overflow-x-auto">
              {['all', 'commodities', 'geopolitics', 'crypto', 'biotech', 'economy', 'science'].map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    if (cat === 'all') {
                      setActiveTopics(['all']);
                    } else {
                      const newTopics = activeTopics.includes(cat as FilterTopic)
                        ? activeTopics.filter(t => t !== cat)
                        : [...activeTopics.filter(t => t !== 'all'), cat as FilterTopic];
                      setActiveTopics(newTopics.length === 0 ? ['all'] : newTopics);
                    }
                  }}
                  className={`
                    px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded border transition-all whitespace-nowrap
                    ${activeTopics.includes(cat as FilterTopic)
                      ? 'bg-nerv-orange/20 border-nerv-orange text-nerv-orange'
                      : 'bg-transparent border-nerv-brown text-nerv-rust hover:border-nerv-orange/50'
                    }
                  `}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Markets List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full text-nerv-rust">
                  <div className="w-8 h-8 border-2 border-nerv-orange border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm font-mono">Loading your markets...</p>
                </div>
              ) : filteredResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-nerv-rust px-8">
                  <p className="text-sm font-mono mb-2">{error || 'No markets found'}</p>
                  {searchTerm && (
                    <p className="text-[11px] text-center">
                      No results in monitored topics. Try:<br/>
                      • Broader search terms<br/>
                      • Standard search mode<br/>
                      • Different topic filters
                    </p>
                  )}
                  {error && (
                    <button 
                      onClick={fetchWatchlistMarkets}
                      className="mt-3 px-3 py-1 text-xs border border-nerv-orange text-nerv-orange hover:bg-nerv-orange/20 rounded"
                    >
                      Retry
                    </button>
                  )}
                </div>
              ) : (
                filteredResults.map((market, i) => (
                  <div
                    key={market.slug}
                    onClick={() => window.open(`https://polymarket.com/event/${market.slug}`, '_blank')}
                    className="px-4 py-3 border-b border-nerv-brown/30 cursor-pointer hover:bg-nerv-void-panel/50 transition-colors"
                  >
                    {/* Question */}
                    <div className="flex gap-3 mb-2">
                      <span className="text-nerv-rust font-mono font-bold text-xs w-6 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span 
                            className="text-[9px] px-1.5 py-0.5 rounded font-mono uppercase"
                            style={{ 
                              backgroundColor: `${CATEGORY_COLORS[market.category]}20`,
                              color: CATEGORY_COLORS[market.category]
                            }}
                          >
                            {market.category}
                          </span>
                          {market._matchedTopics && market._matchedTopics.length > 0 && (
                            market._matchedTopics.slice(0, 2).map(t => (
                              <span key={t.topic} className="text-[9px] px-1.5 py-0.5 bg-nerv-orange/10 text-nerv-orange border border-nerv-orange/30 rounded">
                                {t.topic}
                              </span>
                            ))
                          )}
                          {searchMode === 'smart' && market._searchScore > 1 && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-nerv-void text-nerv-rust border border-nerv-brown rounded">
                              Score: {market._searchScore.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <h3 className="text-nerv-amber font-medium text-[13px] leading-snug line-clamp-2">
                          {market.question}
                        </h3>
                        {market._matchedKeywords && market._matchedKeywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {market._matchedKeywords.slice(0, 4).map(kw => (
                              <span key={kw} className="text-[8px] px-1 py-0.5 bg-nerv-void text-nerv-rust/70 rounded">
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ExternalLink className="w-4 h-4 text-nerv-rust/50 shrink-0" />
                    </div>

                    {/* Prices */}
                    <div className="pl-9 grid grid-cols-3 gap-2 mb-2">
                      <div className="p-2 bg-nerv-void rounded border border-nerv-brown/30">
                        <div className="text-[8px] text-nerv-rust font-mono">YES</div>
                        <div className="text-sm font-mono text-green-400">{(market.yesPrice * 100).toFixed(1)}¢</div>
                      </div>
                      <div className="p-2 bg-nerv-void rounded border border-nerv-brown/30">
                        <div className="text-[8px] text-nerv-rust font-mono">NO</div>
                        <div className="text-sm font-mono text-red-400">{(market.noPrice * 100).toFixed(1)}¢</div>
                      </div>
                      <div className="p-2 bg-nerv-void rounded border border-nerv-brown/30">
                        <div className="text-[8px] text-nerv-rust font-mono">VOL</div>
                        <div className="text-sm font-mono text-nerv-amber">${(market.volume / 1000000).toFixed(1)}M</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-nerv-brown bg-nerv-void-panel flex justify-between text-[10px] text-nerv-rust font-mono">
              <span>Your Watchlist • {filteredResults.length} of {watchlistMarkets.length} markets</span>
              <span>{lastUpdate}</span>
            </div>
          </div>
        </div>
      )}

      {activeView === 'watchlist' && <WatchlistPanel />}
      {activeView === 'resolving' && <ResolvingPanel />}
      {activeView === 'arbitrage' && <ArbitragePanel />}
      {activeView === 'history' && <HistoryPanel />}
    </div>
  );
}
