import { useState, useEffect, useCallback } from 'react';
import { TOPIC_KEYS, type TopicKey } from '../../config/anomalyTopics';
import { POLYMARKET_WATCHLIST, CATEGORY_COLORS } from '../../config/polymarketWatchlist';
import { WatchlistPanel } from './WatchlistPanel';
import { ResolvingPanel } from './ResolvingPanel';
import { ArbitragePanel } from './ArbitragePanel';
import { HistoryPanel } from './HistoryPanel';
import { Activity, Package, Clock, GitCompare, History, ExternalLink } from 'lucide-react';

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
  
  const topics: FilterTopic[] = ['all', ...TOPIC_KEYS, 'other'];

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
        <>
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

          {/* Watchlist Markets List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-nerv-rust">
                <div className="w-8 h-8 border-2 border-nerv-orange border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm font-mono">Loading your markets...</p>
              </div>
            ) : watchlistMarkets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-nerv-rust">
                <p className="text-sm font-mono">{error || 'No markets found'}</p>
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
              watchlistMarkets
                .filter(m => activeTopics.includes('all') || activeTopics.includes(m.category as FilterTopic))
                .map((market, i) => (
                <div
                  key={market.slug}
                  onClick={() => window.open(`https://polymarket.com/event/${market.slug}`, '_blank')}
                  className="px-4 py-3 border-b border-nerv-brown/30 cursor-pointer hover:bg-nerv-void-panel/50 transition-colors"
                >
                  {/* Question */}
                  <div className="flex gap-3 mb-2">
                    <span className="text-nerv-rust font-mono font-bold text-xs w-6 shrink-0">{i + 1}</span>
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
                      </div>
                      <h3 className="text-nerv-amber font-medium text-[13px] leading-snug line-clamp-2">
                        {market.question}
                      </h3>
                    </div>
                    <ExternalLink className="w-4 h-4 text-nerv-rust/50" />
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
            <span>Your Watchlist • {watchlistMarkets.length} markets</span>
            <span>{lastUpdate}</span>
          </div>
        </>
      )}

      {activeView === 'watchlist' && <WatchlistPanel />}
      {activeView === 'resolving' && <ResolvingPanel />}
      {activeView === 'arbitrage' && <ArbitragePanel />}
      {activeView === 'history' && <HistoryPanel />}
    </div>
  );
}
