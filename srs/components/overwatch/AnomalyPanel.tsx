import { useState, useEffect, useCallback, useMemo } from 'react';
import { TOPIC_KEYS, type TopicKey } from '../../config/anomalyTopics';
import { POLYMARKET_WATCHLIST, CATEGORY_COLORS } from '../../config/polymarketWatchlist';
// Removed tabs: Watchlist, Resolving, Arbitrage, History - cleaned up UI
import { PolymarketMonitor } from './PolymarketMonitor';
import { KalshiPanel } from './KalshiPanel';
import { TOPICS, type SearchResult } from '../../lib/polymarket-search';
import { useEvents } from '../../hooks/useEvents';
import { Activity, ExternalLink, Search, X, Sparkles, BarChart3, Target } from 'lucide-react';

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
  // Search metadata (optional)
  _searchScore?: number;
  _matchedTopics?: Array<{ topic: string; score: number; keywords: string[] }>;
  _matchedKeywords?: string[];
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

// API Categories from tag-based discovery
const API_CATEGORIES = ['GEOPOLITICS', 'ECONOMY', 'FINANCE', 'TECH', 'CRYPTO', 'POLITICS'] as const;
type ApiCategory = typeof API_CATEGORIES[number];

type FilterTopic = TopicKey | 'other' | 'all' | ApiCategory;
type ViewTab = 'markets' | 'monitor' | 'kalshi';

export function AnomalyPanel() {
  const [activeView, setActiveView] = useState<ViewTab>('markets');
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [watchlistMarkets, setWatchlistMarkets] = useState<WatchlistMarketData[]>([]);
  const [activeTopics, setActiveTopics] = useState<FilterTopic[]>(['all']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('--:--:--');
  
  // Use useEvents hook (same as Comms tab)
  const {
    displayedMarkets,
    searchResults: eventsSearchResults,
    loading: eventsLoading,
    error: eventsError,
    hasLoaded,
    isSearching,
    search: eventsSearch,
    clearSearch,
    fetchMasterMarkets,
    activeCategory,
    setActiveCategory,
  } = useEvents();
  
  // Local search term state
  const [searchTerm, setSearchTerm] = useState('');
  
  const topics: FilterTopic[] = ['all', ...TOPIC_KEYS, 'other'];

  // Use useEvents search (same as Comms tab)
  const doSearch = async (term: string) => {
    const trimmedTerm = term.trim();
    if (!trimmedTerm) {
      clearSearch();
      return;
    }
    await eventsSearch(trimmedTerm);
  };

  // Convert useEvents markets to WatchlistMarketData format for display
  const marketsToDisplay = useMemo(() => {
    const sourceMarkets = isSearching ? eventsSearchResults : displayedMarkets;
    return sourceMarkets.map((market, index) => ({
      slug: market.slug,
      question: market.question,
      yesPrice: market.yesPrice,
      noPrice: market.noPrice,
      volume: market.volume,
      category: market.category || 'other',
      endDate: market.endDate,
      _searchScore: isSearching ? index + 1 : 1,
      _matchedTopics: [],
      _matchedKeywords: [],
    }));
  }, [eventsSearchResults, displayedMarkets, isSearching]);

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

  // Initialize - load master markets via useEvents
  useEffect(() => {
    fetchWatchlistMarkets();
    fetchMasterMarkets(); // Load markets via useEvents
  }, [fetchWatchlistMarkets, fetchMasterMarkets]);

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

  // Tabs: Markets, Monitor, Kalshi
  const viewTabs: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
    { id: 'markets', label: 'Markets', icon: <Activity className="w-4 h-4" /> },
    { id: 'monitor', label: 'Monitor', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'kalshi', label: 'Kalshi', icon: <Target className="w-4 h-4" /> },
  ];

  return (
    <div className="flex-1 flex flex-col bg-nerv-void h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-nerv-brown bg-nerv-void-panel">
        <h2 className="text-white font-mono font-semibold text-sm mb-1">Polymarket Command Center</h2>
        <p className="text-nerv-rust text-[11px]">Advanced market monitoring, arbitrage detection, and resolution tracking</p>
      </div>

      {/* View Tabs - Simplified */}
      <div className="flex border-b border-nerv-brown bg-nerv-void-panel" style={{ minHeight: '40px' }}>
        <button
          onClick={() => setActiveView('markets')}
          style={{ 
            padding: '8px 16px', 
            color: activeView === 'markets' ? '#E8A03C' : '#8B7355',
            borderBottom: activeView === 'markets' ? '2px solid #E8A03C' : 'none',
            background: activeView === 'markets' ? 'rgba(232, 160, 60, 0.1)' : 'transparent'
          }}
        >
          Markets
        </button>
        <button
          onClick={() => setActiveView('monitor')}
          style={{ 
            padding: '8px 16px', 
            color: activeView === 'monitor' ? '#E8A03C' : '#8B7355',
            borderBottom: activeView === 'monitor' ? '2px solid #E8A03C' : 'none',
            background: activeView === 'monitor' ? 'rgba(232, 160, 60, 0.1)' : 'transparent'
          }}
        >
          Monitor
        </button>
        <button
          onClick={() => setActiveView('kalshi')}
          style={{ 
            padding: '8px 16px', 
            color: activeView === 'kalshi' ? '#E8A03C' : '#8B7355',
            borderBottom: activeView === 'kalshi' ? '2px solid #E8A03C' : 'none',
            background: activeView === 'kalshi' ? 'rgba(232, 160, 60, 0.1)' : 'transparent'
          }}
        >
          Kalshi
        </button>
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
              
              {/* Search Input with Button */}
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        doSearch(searchTerm);
                      }
                    }}
                    placeholder="Search Polymarket..."
                    className="w-full bg-nerv-void border border-nerv-brown rounded px-3 py-2 text-sm text-nerv-amber placeholder-nerv-rust/50 focus:outline-none focus:border-nerv-orange"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => { setSearchTerm(''); doSearch(''); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-nerv-rust hover:text-nerv-amber"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => doSearch(searchTerm)}
                  disabled={eventsLoading}
                  className="px-4 py-2 bg-nerv-orange text-white text-sm font-mono uppercase rounded hover:bg-nerv-orange/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {eventsLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="hidden sm:inline">Search</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span className="hidden sm:inline">Search</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Search Stats */}
            <div className="p-3 border-b border-nerv-brown bg-nerv-void/50">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] text-nerv-rust font-mono">
                  {isSearching ? (
                    <>
                      Search Results: <span className="text-nerv-amber">{marketsToDisplay.length}</span>
                      <span className="text-nerv-rust/60 ml-1">(Live API)</span>
                    </>
                  ) : (
                    <>
                      Markets: <span className="text-nerv-amber">{marketsToDisplay.length}</span>
                      <span className="text-nerv-rust/60 ml-1"> loaded</span>
                    </>
                  )}
                </div>
                {isSearching && (
                  <button
                    onClick={() => { setSearchTerm(''); clearSearch(); }}
                    className="text-[9px] text-nerv-orange hover:text-nerv-amber underline"
                  >
                    Clear Search
                  </button>
                )}
              </div>
              
              {!hasLoaded && !eventsLoading && (
                <div className="mt-2">
                  <button
                    onClick={() => fetchMasterMarkets()}
                    className="w-full py-2 text-[10px] font-mono uppercase bg-nerv-orange/20 text-nerv-orange border border-nerv-orange hover:bg-nerv-orange/30 transition-all"
                  >
                    Load Markets
                  </button>
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

              {/* Search Info */}
              {isSearching && marketsToDisplay.length > 0 && (
                <div className="mt-4">
                  <div className="text-[9px] text-nerv-rust uppercase tracking-wider mb-2">Search Active</div>
                  <div className="text-[10px] text-nerv-amber">
                    Showing {marketsToDisplay.length} results
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
            {/* Markets List - Use category markets or search results -- Category filters removed, use left panel instead */}
            <div className="flex-1 overflow-y-auto">
              {eventsLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-nerv-rust">
                  <div className="w-8 h-8 border-2 border-nerv-orange border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm font-mono">
                    {isSearching ? 'Searching Polymarket...' : 'Loading markets...'}
                  </p>
                  {isSearching && (
                    <p className="text-[10px] text-nerv-rust/60 mt-2">Querying live markets</p>
                  )}
                </div>
              ) : marketsToDisplay.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-nerv-rust px-8">
                  <p className="text-sm font-mono mb-2">{eventsError || 'No markets found'}</p>
                  {searchTerm && (
                    <p className="text-[11px] text-center">
                      No results found. Try:<br/>
                      • Broader search terms<br/>
                      • Different categories
                    </p>
                  )}
                  {eventsError && (
                    <button 
                      onClick={() => fetchMasterMarkets()}
                      className="mt-3 px-3 py-1 text-xs border border-nerv-orange text-nerv-orange hover:bg-nerv-orange/20 rounded"
                    >
                      Retry
                    </button>
                  )}
                </div>
              ) : (
                marketsToDisplay.map((market, i) => (
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
                        </div>
                        <h3 className="text-nerv-amber font-medium text-[13px] leading-snug line-clamp-2">
                          {market.question || 'Untitled Market'}
                        </h3>
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
              <span>
                {isSearching 
                  ? `Search Results • ${marketsToDisplay.length} markets from Polymarket API`
                  : `Markets • ${marketsToDisplay.length} loaded`
                }
              </span>
              <span>{lastUpdate}</span>
            </div>
          </div>
        </div>
      )}

      {activeView === 'monitor' && <PolymarketMonitor />}
      {activeView === 'kalshi' && <KalshiPanel />}
      {/* Removed: watchlist, resolving, arbitrage, history tabs - UI simplified */}
    </div>
  );
}
