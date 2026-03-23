import type { KnowledgeItem } from '../config/knowledgeBase';

export type KnowledgeEvidenceSource =
  | 'curated_local_thesis'
  | 'official_feed'
  | 'research_evidence'
  | 'market_behavior'
  | 'live_intelligence_confirmation';

export type KnowledgeEvidenceConfidence = 'high' | 'medium' | 'low';

export interface KnowledgeEvidenceRecord {
  id: string;
  title: string;
  summary: string;
  source: KnowledgeEvidenceSource;
  confidence: KnowledgeEvidenceConfidence;
  tags: string[];
  url?: string;
  publishedAt?: string;
}

export interface ProtocolResearchSignal extends KnowledgeEvidenceRecord {
  source: 'official_feed' | 'research_evidence' | 'curated_local_thesis';
}

export interface BiomarkerEnrichedQuery {
  rawQuery: string;
  normalizedQuery: string;
  signals: string[];
}

const BIOTECH_KEYWORDS = [
  'health',
  'biotech',
  'longevity',
  'protocol',
  'sleep',
  'hrv',
  'supplement',
  'recovery',
  'performance',
  'metabolic',
  'pharma',
];

export function toBiomarkerEnrichedQuery(rawQuery: string, signals: string[]): BiomarkerEnrichedQuery {
  const normalizedQuery = [rawQuery.trim(), ...signals].filter(Boolean).join(' | ');
  return {
    rawQuery,
    normalizedQuery,
    signals,
  };
}

export function matchKnowledgeEvidence(items: KnowledgeItem[], query: string): ProtocolResearchSignal[] {
  const lowered = query.toLowerCase();
  return items
    .filter((item) => {
      const haystack = `${item.title} ${item.summary} ${item.content} ${item.tags.join(' ')}`.toLowerCase();
      return BIOTECH_KEYWORDS.some((keyword) => haystack.includes(keyword)) && (!lowered || haystack.includes(lowered));
    })
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      source: 'curated_local_thesis',
      confidence: 'high',
      tags: item.tags,
      publishedAt: item.lastUpdated,
    }));
}