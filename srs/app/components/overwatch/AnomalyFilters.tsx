import { ANOMALY_TOPICS, type TopicKey } from '../../../config/anomalyTopics';

interface AnomalyFiltersProps {
  activeTopics: (TopicKey | 'other')[];
  onTopicToggle: (topic: TopicKey | 'other') => void;
  onToggleAll: () => void;
}

const TOPIC_ORDER: (TopicKey | 'other')[] = [
  'geopolitics',
  'ai',
  'crypto',
  'economy',
  'finance',
  'science',
  'tech',
  'other',
];

export function AnomalyFilters({ activeTopics, onTopicToggle, onToggleAll }: AnomalyFiltersProps) {
  const allActive = activeTopics.length === TOPIC_ORDER.length;
  
  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-nerv-brown/30">
      {/* All toggle */}
      <button
        onClick={onToggleAll}
        className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider rounded border transition-all ${
          allActive
            ? 'bg-nerv-orange/20 border-nerv-orange text-nerv-orange'
            : 'bg-transparent border-nerv-brown text-nerv-rust hover:border-nerv-orange/50'
        }`}
      >
        All
      </button>
      
      {/* Topic filters */}
      {TOPIC_ORDER.map((topic) => {
        const isActive = activeTopics.includes(topic);
        const label = topic === 'other' ? 'Other' : ANOMALY_TOPICS[topic as TopicKey].label;
        
        return (
          <button
            key={topic}
            onClick={() => onTopicToggle(topic)}
            className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider rounded border transition-all ${
              isActive
                ? 'bg-nerv-orange/20 border-nerv-orange text-nerv-orange'
                : 'bg-transparent border-nerv-brown text-nerv-rust hover:border-nerv-orange/50'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
