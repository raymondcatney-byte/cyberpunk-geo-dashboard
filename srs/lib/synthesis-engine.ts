import { KNOWLEDGE_BASE } from '../config/knowledgeBase';
import { buildPaperTradeIdeas, scorePredictionOpportunities, scoreYieldDislocations } from './opportunity-engine';
import type { TradingEnergySignal, TradingSnapshot } from './trading-intel';

export type SynthesisDomain =
  | 'prediction_market'
  | 'defi'
  | 'energy'
  | 'biotech'
  | 'geopolitics';

export type EvidenceSource =
  | 'market'
  | 'yield'
  | 'energy'
  | 'watchtower'
  | 'research'
  | 'curated_kb'
  | 'official_feed';

export type ConfidenceTier = 'low' | 'medium' | 'high';

export interface SynthesisEvidenceRecord {
  id: string;
  domain: SynthesisDomain;
  source: EvidenceSource;
  title: string;
  summary: string;
  confidence: ConfidenceTier;
  relevance: number;
  tags: string[];
  url?: string;
  region?: string;
  timestamp?: string;
}

export interface DomainAlert {
  id: string;
  domain: SynthesisDomain;
  severity: 'low' | 'medium' | 'high';
  title: string;
  summary: string;
  region?: string;
  relatedEvidenceIds: string[];
}

export interface OpportunityTimeline {
  id: string;
  domain: SynthesisDomain;
  title: string;
  horizon: string;
  catalysts: string[];
  invalidation: string;
}

export interface SynthesisOpportunity {
  id: string;
  domain: Extract<SynthesisDomain, 'prediction_market' | 'defi' | 'energy'>;
  title: string;
  summary: string;
  venue?: string;
  edge: number;
  confidence: number;
  horizon: string;
  score: number;
  catalysts: string[];
  invalidation: string;
  relatedEvidenceIds: string[];
  tags: string[];
  region?: string;
}

export interface PaperTradeRecord {
  id: string;
  title: string;
  domain: 'prediction' | 'yield';
  action: 'buy' | 'sell' | 'monitor';
  confidence: number;
  edge: number;
  rationale: string;
  invalidation: string;
}

export interface BiotechSignal {
  id: string;
  title: string;
  summary: string;
  source: EvidenceSource;
  confidence: ConfidenceTier;
  tags: string[];
  url?: string;
  timestamp?: string;
}

export interface GeopoliticalSignal {
  id: string;
  title: string;
  summary: string;
  region?: string;
  source: EvidenceSource;
  confidence: ConfidenceTier;
  tags: string[];
  url?: string;
  timestamp?: string;
}

export interface SynthesisResult {
  opportunities: SynthesisOpportunity[];
  alerts: DomainAlert[];
  evidence: SynthesisEvidenceRecord[];
  timelines: OpportunityTimeline[];
  paperTrades: PaperTradeRecord[];
  biotechSignals: BiotechSignal[];
  geopoliticalSignals: GeopoliticalSignal[];
}

const BIOTECH_TAGS = ['biotech', 'health', 'fda', 'nih', 'pharma', 'clinical', 'drug', 'medical'];
const GEOPOLITICAL_TAGS = [
  'geopolitics',
  'conflict',
  'sanctions',
  'trade',
  'macro',
  'security',
  'war',
  'shipping',
  'maritime',
  'diplomacy',
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function toConfidenceTier(value: number): ConfidenceTier {
  if (value >= 80) return 'high';
  if (value >= 55) return 'medium';
  return 'low';
}

function similarityScore(a: string, b: string) {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  return overlap / Math.max(1, Math.min(left.size, right.size));
}

function inferRegion(title: string, fallback?: string) {
  if (fallback) return fallback;
  const lowered = title.toLowerCase();
  const regions = [
    'taiwan',
    'china',
    'ukraine',
    'russia',
    'iran',
    'israel',
    'gaza',
    'suez',
    'red sea',
    'europe',
    'united states',
    'us',
    'canada',
    'greenland',
  ];
  return regions.find((region) => lowered.includes(region)) || undefined;
}

function buildKnowledgeEvidence(query: string, domain: SynthesisDomain): SynthesisEvidenceRecord[] {
  return KNOWLEDGE_BASE.map((item) => {
    const overlap = similarityScore(query, `${item.title} ${item.summary} ${item.tags.join(' ')}`);
    return {
      id: `kb-${domain}-${item.id}`,
      domain,
      source: 'curated_kb' as const,
      title: item.title,
      summary: item.summary,
      confidence: (overlap >= 0.35 ? 'high' : overlap >= 0.2 ? 'medium' : 'low') as ConfidenceTier,
      relevance: Math.round(overlap * 100),
      tags: item.tags,
    };
  })
    .filter((item) => item.relevance >= 18)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 3);
}

function buildEnergyEvidence(signal: TradingEnergySignal): SynthesisEvidenceRecord {
  return {
    id: `energy-${signal.id}`,
    domain: 'energy',
    source: 'energy',
    title: `${signal.regionCode} ${signal.metric}`,
    summary: signal.summary,
    confidence: toConfidenceTier(signal.stressScore),
    relevance: Math.round(signal.stressScore),
    tags: [signal.category, signal.metric, signal.regionCode.toLowerCase()],
    region: signal.region,
    timestamp: signal.timestamp,
  };
}

function buildWatchtowerEvidence(snapshot: TradingSnapshot) {
  const biotechSignals: BiotechSignal[] = [];
  const geopoliticalSignals: GeopoliticalSignal[] = [];
  const evidence: SynthesisEvidenceRecord[] = [];

  for (const item of snapshot.watchtower) {
    const tags = (item.tags || []).map((tag) => tag.toLowerCase());
    const isBiotech = tags.some((tag) => BIOTECH_TAGS.includes(tag));
    const isGeopolitical = tags.some((tag) => GEOPOLITICAL_TAGS.includes(tag)) || !isBiotech;

    if (isBiotech) {
      const signal: BiotechSignal = {
        id: `biotech-${item.id}`,
        title: item.title,
        summary: `${item.source} signal${item.region ? ` in ${item.region}` : ''}`,
        source: 'official_feed',
        confidence: 'medium',
        tags,
        url: item.url,
        timestamp: item.publishedAt,
      };
      biotechSignals.push(signal);
      evidence.push({
        id: signal.id,
        domain: 'biotech',
        source: signal.source,
        title: signal.title,
        summary: signal.summary,
        confidence: signal.confidence,
        relevance: 68,
        tags: signal.tags,
        url: signal.url,
        region: item.region,
        timestamp: signal.timestamp,
      });
    }

    if (isGeopolitical) {
      const signal: GeopoliticalSignal = {
        id: `geo-${item.id}`,
        title: item.title,
        summary: `${item.source} strategic feed${item.region ? ` in ${item.region}` : ''}`,
        region: item.region || inferRegion(item.title),
        source: 'watchtower',
        confidence: tags.includes('sanctions') || tags.includes('conflict') ? 'high' : 'medium',
        tags,
        url: item.url,
        timestamp: item.publishedAt,
      };
      geopoliticalSignals.push(signal);
      evidence.push({
        id: signal.id,
        domain: 'geopolitics',
        source: signal.source,
        title: signal.title,
        summary: signal.summary,
        confidence: signal.confidence,
        relevance: signal.confidence === 'high' ? 82 : 65,
        tags: signal.tags,
        url: signal.url,
        region: signal.region,
        timestamp: signal.timestamp,
      });
    }
  }

  return { biotechSignals: biotechSignals.slice(0, 8), geopoliticalSignals: geopoliticalSignals.slice(0, 10), evidence };
}

export function synthesizeSnapshot(snapshot: TradingSnapshot | null): SynthesisResult {
  if (!snapshot) {
    return {
      opportunities: [],
      alerts: [],
      evidence: [],
      timelines: [],
      paperTrades: [],
      biotechSignals: [],
      geopoliticalSignals: [],
    };
  }

  const predictionEdges = scorePredictionOpportunities(snapshot);
  const yieldDislocations = scoreYieldDislocations(snapshot);
  const marketKnowledge = predictionEdges.flatMap((opportunity) => buildKnowledgeEvidence(opportunity.title, 'prediction_market'));
  const defiKnowledge = yieldDislocations.flatMap((signal) => buildKnowledgeEvidence(`${signal.project} ${signal.symbol}`, 'defi'));
  const biotechKnowledge = buildKnowledgeEvidence(
    snapshot.watchtower
      .filter((item) => (item.tags || []).some((tag) => BIOTECH_TAGS.includes(tag.toLowerCase())))
      .map((item) => item.title)
      .join(' '),
    'biotech'
  );
  const geopoliticalKnowledge = buildKnowledgeEvidence(
    snapshot.watchtower
      .filter((item) => (item.tags || []).some((tag) => GEOPOLITICAL_TAGS.includes(tag.toLowerCase())))
      .map((item) => item.title)
      .join(' '),
    'geopolitics'
  );

  const energyEvidence = snapshot.energy.slice(0, 8).map(buildEnergyEvidence);
  const watchtowerBundles = buildWatchtowerEvidence(snapshot);
  const evidence = [
    ...marketKnowledge,
    ...defiKnowledge,
    ...biotechKnowledge,
    ...geopoliticalKnowledge,
    ...energyEvidence,
    ...watchtowerBundles.evidence,
  ].filter(
    (item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index
  );

  const opportunities: SynthesisOpportunity[] = [
    ...predictionEdges.map((opportunity) => ({
      id: `prediction-${opportunity.id}`,
      domain: 'prediction_market' as const,
      title: opportunity.title,
      summary: opportunity.thesis,
      venue: opportunity.venue,
      edge: opportunity.edge,
      confidence: opportunity.confidence,
      horizon: 'event-driven',
      score: Math.round(Math.abs(opportunity.edge) * 1000 + opportunity.confidence),
      catalysts: opportunity.catalysts,
      invalidation: 'Stand down if the catalyst stack weakens, event timing slips, or the cross-venue spread closes without new evidence.',
      relatedEvidenceIds: evidence
        .filter((item) => item.domain === 'prediction_market' || item.domain === 'energy' || item.domain === 'geopolitics')
        .filter((item) => similarityScore(opportunity.title, `${item.title} ${item.summary} ${item.tags.join(' ')}`) >= 0.18)
        .map((item) => item.id)
        .slice(0, 5),
      tags: opportunity.tags,
      region: inferRegion(opportunity.title),
    })),
    ...yieldDislocations.map((signal) => ({
      id: `defi-${signal.id}`,
      domain: 'defi' as const,
      title: `${signal.project} ${signal.symbol}`,
      summary: signal.rationale,
      venue: signal.chain,
      edge: signal.apy / 100,
      confidence: clamp(Math.round(signal.score * 2.2), 45, 90),
      horizon: 'carry / flow',
      score: Math.round(signal.score * 10),
      catalysts: [
        `${signal.classification} yield structure`,
        'Protocol fundamentals and incentive stack are driving current pricing',
      ],
      invalidation:
        signal.classification === 'stressed'
          ? 'Invalid if TVL continues to erode, emissions dominate the headline APY, or whale flows stay risk-off.'
          : 'Invalid if base activity fades, reward dependency rises, or flow support breaks lower.',
      relatedEvidenceIds: evidence
        .filter((item) => item.domain === 'defi' || item.domain === 'energy')
        .filter((item) => similarityScore(`${signal.project} ${signal.symbol}`, `${item.title} ${item.summary}`) >= 0.12)
        .map((item) => item.id)
        .slice(0, 4),
      tags: [signal.classification, signal.chain.toLowerCase(), signal.symbol.toLowerCase()],
    })),
    ...snapshot.energy
      .filter((signal) => signal.stressScore >= 62)
      .slice(0, 4)
      .map((signal) => ({
        id: `energy-opportunity-${signal.id}`,
        domain: 'energy' as const,
        title: `${signal.region} ${signal.metric} stress`,
        summary: signal.summary,
        venue: signal.source,
        edge: signal.stressScore / 100,
        confidence: clamp(Math.round(signal.stressScore), 55, 92),
        horizon: 'near-term catalyst',
        score: Math.round(signal.stressScore * 9),
        catalysts: [`${signal.regionCode} ${signal.metric} dislocation`, 'Energy stress can reprice regional and event-driven narratives quickly'],
        invalidation: 'Invalid if grid stress normalizes, supply pressure eases, or local pricing reverts without follow-through.',
        relatedEvidenceIds: [buildEnergyEvidence(signal).id],
        tags: [signal.category, signal.metric, signal.regionCode.toLowerCase()],
        region: signal.region,
      })),
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const alerts: DomainAlert[] = [
    ...snapshot.energy
      .filter((signal) => signal.stressScore >= 64)
      .slice(0, 5)
      .map((signal) => ({
        id: `alert-energy-${signal.id}`,
        domain: 'energy' as const,
        severity: signal.stressScore >= 78 ? 'high' as const : 'medium' as const,
        title: `${signal.regionCode} grid stress`,
        summary: signal.summary,
        region: signal.region,
        relatedEvidenceIds: [buildEnergyEvidence(signal).id],
      })),
    ...watchtowerBundles.geopoliticalSignals.slice(0, 5).map((signal) => ({
      id: `alert-geo-${signal.id}`,
      domain: 'geopolitics' as const,
      severity: signal.confidence === 'high' ? 'high' as const : 'medium' as const,
      title: signal.title,
      summary: signal.summary,
      region: signal.region,
      relatedEvidenceIds: [signal.id],
    })),
    ...watchtowerBundles.biotechSignals.slice(0, 4).map((signal) => ({
      id: `alert-biotech-${signal.id}`,
      domain: 'biotech' as const,
      severity: signal.confidence === 'high' ? 'high' as const : 'medium' as const,
      title: signal.title,
      summary: signal.summary,
      relatedEvidenceIds: [signal.id],
    })),
  ].slice(0, 10);

  const timelines: OpportunityTimeline[] = opportunities.slice(0, 8).map((opportunity) => ({
    id: `timeline-${opportunity.id}`,
    domain: opportunity.domain,
    title: opportunity.title,
    horizon: opportunity.horizon,
    catalysts: opportunity.catalysts,
    invalidation: opportunity.invalidation,
  }));

  return {
    opportunities,
    alerts,
    evidence,
    timelines,
    paperTrades: buildPaperTradeIdeas(predictionEdges, yieldDislocations),
    biotechSignals: watchtowerBundles.biotechSignals.slice(0, 6),
    geopoliticalSignals: watchtowerBundles.geopoliticalSignals.slice(0, 6),
  };
}

function evidenceLine(item: SynthesisEvidenceRecord) {
  const tags = item.tags.length ? ` [${item.tags.slice(0, 3).join(', ')}]` : '';
  const region = item.region ? ` (${item.region})` : '';
  return `- ${item.title}${region}: ${item.summary}${tags}`;
}

export function buildBruceContext(synthesis: SynthesisResult) {
  return {
    opportunities: synthesis.opportunities
      .filter((item) => item.domain === 'prediction_market' || item.domain === 'defi' || item.domain === 'energy')
      .slice(0, 6)
      .map((item) => ({
        domain: item.domain,
        title: item.title,
        venue: item.venue,
        edgePct: Number((item.edge * 100).toFixed(1)),
        confidence: item.confidence,
        horizon: item.horizon,
        catalysts: item.catalysts.slice(0, 3),
        invalidation: item.invalidation,
      })),
    biotechSignals: synthesis.biotechSignals.slice(0, 4),
    evidenceSummary: synthesis.evidence
      .filter((item) => item.domain !== 'geopolitics')
      .slice(0, 8)
      .map(evidenceLine),
  };
}

export function buildMakaveliContext(synthesis: SynthesisResult) {
  return {
    geopoliticalSignals: synthesis.geopoliticalSignals.slice(0, 5),
    energyAlerts: synthesis.alerts.filter((item) => item.domain === 'energy').slice(0, 4),
    marketLinkedHotspots: synthesis.opportunities
      .filter((item) => item.domain === 'prediction_market' && item.region)
      .slice(0, 4)
      .map((item) => ({
        title: item.title,
        region: item.region,
        edgePct: Number((item.edge * 100).toFixed(1)),
        catalysts: item.catalysts.slice(0, 2),
      })),
    evidenceSummary: synthesis.evidence
      .filter((item) => item.domain === 'geopolitics' || item.domain === 'energy')
      .slice(0, 8)
      .map(evidenceLine),
  };
}