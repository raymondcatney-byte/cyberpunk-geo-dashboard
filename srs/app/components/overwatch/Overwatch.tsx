import { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { AnomalyCard } from './AnomalyCard';
import { AnomalyFilters } from './AnomalyFilters';
import { ThresholdControl } from './ThresholdControl';
import { useAnomalyDetection } from '../../../hooks/useAnomalyDetection';
import { TOPIC_KEYS, type TopicKey } from '../../../config/anomalyTopics';

export function Overwatch() {
  const [threshold, setThreshold] = useState(15);
  const [activeTopics, setActiveTopics] = useState<(TopicKey | 'other')[]>([...TOPIC_KEYS, 'other']);
  
  const { anomalies, loading, error, lastUpdated, refetch } = useAnomalyDetection({
    threshold,
    minVolume: 1000,
    activeTopics,
  });

  const handleTopicToggle = useCallback((topic: TopicKey | 'other') => {
    setActiveTopics(prev => 
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  }, []);

  const handleToggleAll = useCallback(() => {
    const allTopics: (TopicKey | 'other')[] = [...TOPIC_KEYS, 'other'];
    setActiveTopics(prev => 
      prev.length === allTopics.length ? [] : allTopics
    );
  }, []);

  return (
    <div className="h-full flex flex-col bg-nerv-void">
      {/* Header */}
      <div className="h-[60px] border-b border-nerv-brown bg-nerv-void-panel flex items-center px-4 gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-nerv-orange font-mono text-sm font-bold tracking-wider">
            OVERWATCH
          </span>
        </div>

        <span className="text-nerv-rust text-[10px] font-mono uppercase">
          Fast-Moving Markets
        </span>

        <div className="flex-1" />

        {/* Status */}
        <div className="flex items-center gap-3 text-[10px] font-mono">
          {loading ? (
            <span className="text-nerv-orange animate-pulse">SCANNING...</span>
          ) : error ? (
            <span className="text-alert-red">ERROR</span>
          ) : (
            <>
              <span className="text-data-green">● LIVE</span>
              <span className="text-nerv-rust">
                {anomalies.length} detected
              </span>
            </>
          )}
          {lastUpdated && (
            <span className="text-nerv-rust">
              {Math.floor((Date.now() - lastUpdated.getTime()) / 60000)}m ago
            </span>
          )}
          <button
            onClick={refetch}
            disabled={loading}
            className="p-1.5 hover:bg-nerv-brown/30 rounded transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-nerv-rust ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Threshold Control */}
      <ThresholdControl
        threshold={threshold}
        onThresholdChange={setThreshold}
      />

      {/* Category Filters */}
      <AnomalyFilters
        activeTopics={activeTopics}
        onTopicToggle={handleTopicToggle}
        onToggleAll={handleToggleAll}
      />

      {/* Anomalies List */}
      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-alert-red">
            <p className="text-sm font-mono">{error}</p>
            <button
              onClick={refetch}
              className="mt-4 px-4 py-2 border border-alert-red text-alert-red hover:bg-alert-red/10 transition-colors text-xs uppercase"
            >
              Retry
            </button>
          </div>
        ) : loading && anomalies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-nerv-rust">
            <div className="w-8 h-8 border-2 border-nerv-orange border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-mono">Scanning markets...</p>
          </div>
        ) : anomalies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-nerv-rust">
            <p className="text-sm font-mono">No anomalies detected</p>
            <p className="text-xs mt-2 text-nerv-rust/60">
              Try lowering the threshold or selecting more categories
            </p>
          </div>
        ) : (
          <div>
            {anomalies.map((anomaly, index) => (
              <AnomalyCard
                key={anomaly.id}
                rank={index + 1}
                question={anomaly.question}
                topic={anomaly.topic}
                detectedPrice={anomaly.detectedPrice}
                peakPrice={anomaly.peakPrice}
                nowPrice={anomaly.nowPrice}
                change={anomaly.change}
                volume={anomaly.volume}
                slug={anomaly.slug}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-nerv-brown bg-nerv-void-panel flex justify-between items-center text-[10px] text-nerv-rust/60 font-mono">
        <span>Source: Polymarket</span>
        <span>Auto-refresh: 30s</span>
      </div>
    </div>
  );
}
