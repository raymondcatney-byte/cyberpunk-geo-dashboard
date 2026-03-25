import { useEffect, useState } from 'react';
import { TOPIC_KEYS, type TopicKey } from '../../config/anomalyTopics';

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

export function AnomalyPanel() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [activeTopics, setActiveTopics] = useState<FilterTopic[]>(['all']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('--:--:--');
  
  const topics: FilterTopic[] = ['all', ...TOPIC_KEYS, 'other'];

  const fetchData = async () => {
    try {
      setError(null);
      const res = await fetch('/api/polymarket');
      const data = await res.json();
      setAnomalies(data.anomalies || []);
      if (data.error) {
        setError(data.error);
      }
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Failed to fetch:', e);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="flex-1 flex flex-col bg-nerv-void h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-nerv-brown bg-nerv-void-panel">
        <h2 className="text-white font-mono font-semibold text-sm mb-1">Fast-Moving Markets</h2>
        <p className="text-nerv-rust text-[11px]">Markets with the biggest price changes detected across all topics</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-4 py-2 border-b border-nerv-brown bg-nerv-void-panel overflow-x-auto">
        {topics.map(topic => (
          <button
            key={topic}
            onClick={() => toggleTopic(topic)}
            className={`
              px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider rounded border transition-all whitespace-nowrap
              ${activeTopics.includes(topic)
                ? 'bg-nerv-orange/20 border-nerv-orange text-nerv-orange'
                : 'bg-transparent border-nerv-brown text-nerv-rust hover:border-nerv-orange/50'
              }
            `}
          >
            {topic}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-nerv-rust">
            <div className="w-8 h-8 border-2 border-nerv-orange border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-mono">Loading markets...</p>
          </div>
        ) : filteredAnomalies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-nerv-rust">
            <p className="text-sm font-mono">{error || 'No movements detected'}</p>
            {error && (
              <button 
                onClick={fetchData}
                className="mt-3 px-3 py-1 text-xs border border-nerv-orange text-nerv-orange hover:bg-nerv-orange/20 rounded"
              >
                Retry
              </button>
            )}
          </div>
        ) : (
          filteredAnomalies.map((a, i) => (
            <div
              key={i}
              onClick={() => window.open(`https://polymarket.com/event/${a.slug}`, '_blank')}
              className="px-4 py-3 border-b border-nerv-brown/30 cursor-pointer hover:bg-nerv-void-panel/50 transition-colors"
            >
              {/* Question */}
              <div className="flex gap-3 mb-2">
                <span className="text-nerv-rust font-mono font-bold text-xs w-6 shrink-0">{i + 1}</span>
                <h3 className="text-nerv-amber font-medium text-[13px] leading-snug line-clamp-2">
                  {a.question}
                </h3>
              </div>

              {/* Price Movement */}
              <div className="pl-9 mb-1.5 text-xs text-nerv-rust">
                <span className="text-nerv-rust/70">Detected {a.detectedPrice}¢ {formatTime(a.detectedAt)}</span>
                {' → '}
                <span className="text-nerv-orange">Peak {a.peakPrice}¢ {formatTime(a.movedAt)}</span>
                {' → '}
                <span className="text-white font-medium">Now {a.nowPrice}¢</span>
              </div>

              {/* Change */}
              <div className={`pl-9 mb-1.5 text-sm font-mono font-bold ${a.direction === 'up' ? 'text-data-green' : 'text-alert-red'}`}>
                Change {a.direction === 'up' ? '+' : ''}{a.change}%
              </div>

              {/* Topic & Volume */}
              <div className="pl-9 flex gap-3 text-[11px] text-nerv-rust/70">
                <span 
                  className="uppercase font-mono"
                  style={{ color: TOPIC_COLORS[a.topic] }}
                >
                  {a.topic}
                </span>
                <span>•</span>
                <span>Vol: {formatVolume(a.volume)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-nerv-brown bg-nerv-void-panel flex justify-between text-[10px] text-nerv-rust font-mono">
        <span>Source: Polymarket</span>
        <span>{lastUpdate}</span>
      </div>
    </div>
  );
}
