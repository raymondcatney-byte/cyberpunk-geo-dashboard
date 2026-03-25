import { useEffect, useState } from 'react';

const TOPIC_COLORS = {
  geopolitics: '#ef4444',
  ai: '#a855f7',
  crypto: '#f59e0b',
  economy: '#10b981',
  finance: '#3b82f6',
  science: '#06b6d4',
  tech: '#ec4899',
  other: '#666666'
};

export default function AnomalyPanel() {
  const [anomalies, setAnomalies] = useState([]);
  const [activeTopics, setActiveTopics] = useState(['all']);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('--:--:--');

  const topics = ['all', 'geopolitics', 'ai', 'crypto', 'economy', 'finance', 'science', 'tech'];

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/polymarket');
      const data = await res.json();
      setAnomalies(data.anomalies || []);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleTopic = (topic) => {
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
    : anomalies.filter(a => activeTopics.includes(a.topic));

  const formatTime = (ms) => {
    const diff = Date.now() - ms;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m ago`;
    return `${minutes}m ago`;
  };

  const formatVolume = (v) => {
    return v > 1000 ? `${(v / 1000).toFixed(1)}K` : v.toString();
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '600px',
      background: '#0a0a0a',
      border: '1px solid #222',
      borderRadius: '8px',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '13px'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #222',
        background: '#111'
      }}>
        <h2 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: 600 }}>Fast-Moving Markets</h2>
        <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '12px' }}>
          Markets with the biggest price changes detected across all topics
        </p>
      </div>

      {/* Filters */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #222',
        background: '#111',
        display: 'flex',
        gap: '8px',
        overflowX: 'auto'
      }}>
        {topics.map(topic => (
          <button
            key={topic}
            onClick={() => toggleTopic(topic)}
            style={{
              padding: '6px 12px',
              border: `1px solid ${activeTopics.includes(topic) ? (topic === 'all' ? '#444' : TOPIC_COLORS[topic]) : '#333'}`,
              background: activeTopics.includes(topic) ? '#222' : 'transparent',
              color: activeTopics.includes(topic) ? (topic === 'all' ? '#fff' : TOPIC_COLORS[topic]) : '#888',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              borderRadius: '4px',
              whiteSpace: 'nowrap'
            }}
          >
            {topic}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#555' }}>
            Loading markets...
          </div>
        ) : filteredAnomalies.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#444' }}>
            No movements detected
          </div>
        ) : (
          filteredAnomalies.map((a, i) => (
            <div
              key={i}
              onClick={() => window.open(`https://polymarket.com/event/${a.slug}`, '_blank')}
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #1a1a1a',
                cursor: 'pointer',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#111'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              {/* Question */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                <span style={{ color: '#555', fontWeight: 600, fontSize: '12px', width: '24px', flexShrink: 0 }}>
                  {i + 1}
                </span>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '13px', fontWeight: 500, lineHeight: 1.4 }}>
                  {a.question}
                </h3>
              </div>

              {/* Price Movement */}
              <div style={{ paddingLeft: '36px', marginBottom: '6px', fontSize: '12px', color: '#888' }}>
                <span style={{ color: '#666' }}>Detected {a.detectedPrice}¢ {formatTime(a.detectedAt)}</span>
                {' → '}
                <span style={{ color: '#f59e0b' }}>Peak {a.peakPrice}¢ {formatTime(a.movedAt)}</span>
                {' → '}
                <span style={{ color: '#fff', fontWeight: 500 }}>Now {a.nowPrice}¢</span>
              </div>

              {/* Change */}
              <div style={{
                paddingLeft: '36px',
                marginBottom: '6px',
                fontSize: '14px',
                fontWeight: 600,
                color: a.direction === 'up' ? '#22c55e' : '#ef4444'
              }}>
                Change {a.direction === 'up' ? '+' : ''}{a.change}%
              </div>

              {/* Topic & Volume */}
              <div style={{ paddingLeft: '36px', display: 'flex', gap: '12px', fontSize: '11px', color: '#666' }}>
                <span style={{ textTransform: 'uppercase', fontWeight: 500, color: TOPIC_COLORS[a.topic] || '#666' }}>
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
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid #222',
        background: '#111',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: '#444'
      }}>
        <span>Source: Polymarket</span>
        <span>{lastUpdate}</span>
      </div>
    </div>
  );
}
