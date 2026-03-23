/**
 * KB Causation Engine
 * Prediction market intelligence via semantic pattern matching
 * Ported from Kimiclaw's engine
 */

// ============================================
// TYPES
// ============================================
export type Domain = 'biotech' | 'geopolitics' | 'commodities' | 'crypto' | 'ai' | 'robotics' | 'human_optimization';
export type KBEntryType = 'pattern' | 'event' | 'prediction' | 'outcome';

export interface KBEntry {
  id: string;
  content: string;
  metadata: {
    type: KBEntryType;
    domain: Domain;
    asset: string;
    timestamp: number;
    outcome?: 'correct' | 'incorrect' | 'pending';
    edge?: number;
    tags?: string[];
  };
  embedding?: number[];
}

export interface ExternalEvent {
  type: string;
  description: string;
  timestamp: number;
  significance?: number;
}

export interface CausationQuery {
  asset: string;
  priceMove: { magnitude: number; timeframe: string };
  domain: Domain;
  currentMarketPrice: number;
  externalEvents: ExternalEvent[];
}

export interface CausationAnalysis {
  primaryCatalyst: { event: string; confidence: number; evidence: string[] };
  contributingFactors: Array<{ factor: string; weight: number }>;
  historicalMatches: Array<{ event: string; date: string; outcome: string; edge?: number }>;
  edgeEstimate: { magnitude: number; direction: 'up' | 'down' | 'neutral'; confidence: number; reasoning: string };
  recommendation: { action: 'predict' | 'monitor' | 'dismiss'; rationale: string; urgency: 'immediate' | 'hours' | 'days' };
}

// ============================================
// VECTOR STORE
// ============================================
export class KBVectorStore {
  private entries = new Map<string, KBEntry>();
  private embeddings = new Map<string, number[]>();

  async embed(text: string): Promise<number[]> {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0);
    words.forEach((word, idx) => {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(i);
        hash = hash & hash;
      }
      embedding[Math.abs(hash) % 384] = 1 + (idx / words.length);
    });
    const magnitude = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    return embedding.map(v => v / (magnitude || 1));
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
  }

  async store(entry: KBEntry): Promise<void> {
    const emb = await this.embed(entry.content);
    this.entries.set(entry.id, { ...entry, embedding: emb });
    this.embeddings.set(entry.id, emb);
  }

  async storeBatch(entries: KBEntry[]): Promise<void> {
    for (const e of entries) await this.store(e);
  }

  async query(params: {
    query: string;
    filters?: { type?: KBEntryType; domain?: Domain; asset?: string; outcome?: string };
    topK?: number;
  }): Promise<KBEntry[]> {
    const qEmb = await this.embed(params.query);
    const scored = Array.from(this.entries.entries())
      .map(([id, entry]) => ({
        entry,
        similarity: this.cosineSimilarity(qEmb, this.embeddings.get(id)!)
      }))
      .filter(({ entry }) => {
        if (params.filters?.type && entry.metadata.type !== params.filters.type) return false;
        if (params.filters?.domain && entry.metadata.domain !== params.filters.domain) return false;
        if (params.filters?.asset && entry.metadata.asset !== params.filters.asset) return false;
        return true;
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, params.topK || 10);
    return scored.map(s => s.entry);
  }

  async stats() {
    const byType: Record<string, number> = {};
    const byDomain: Record<string, number> = {};
    for (const e of this.entries.values()) {
      byType[e.metadata.type] = (byType[e.metadata.type] || 0) + 1;
      byDomain[e.metadata.domain] = (byDomain[e.metadata.domain] || 0) + 1;
    }
    return { total: this.entries.size, byType, byDomain };
  }

  // Persistence
  serialize(): string {
    const data = Array.from(this.entries.values());
    return JSON.stringify(data);
  }

  async deserialize(json: string): Promise<void> {
    const data: KBEntry[] = JSON.parse(json);
    this.entries.clear();
    this.embeddings.clear();
    for (const entry of data) {
      if (entry.embedding) {
        this.entries.set(entry.id, entry);
        this.embeddings.set(entry.id, entry.embedding);
      } else {
        await this.store(entry);
      }
    }
  }
}

// ============================================
// CAUSATION ENGINE
// ============================================
export class CausationEngine {
  constructor(private vectorStore: KBVectorStore) {}

  async analyze(query: CausationQuery): Promise<CausationAnalysis> {
    const searchQuery = `${query.asset} ${query.priceMove.magnitude > 0 ? 'increase' : 'decrease'} ${Math.abs(query.priceMove.magnitude * 100).toFixed(1)}% ${query.externalEvents.map(e => e.type + ' ' + e.description).join(' ')}`;
    
    const events = await this.vectorStore.query({ query: searchQuery, filters: { domain: query.domain }, topK: 20 });
    const patterns = await this.vectorStore.query({ query: searchQuery, filters: { type: 'pattern', domain: query.domain }, topK: 5 });

    const catalysts = query.externalEvents.map(ev => ({
      event: `${ev.type}: ${ev.description}`,
      confidence: Math.min(ev.significance || 0.5, 0.95),
      evidence: [`Significance: ${ev.significance}`]
    })).sort((a, b) => b.confidence - a.confidence);

    const outcomes = events.filter(e => e.metadata.outcome);
    const winRate = outcomes.length ? outcomes.filter(e => e.metadata.outcome === 'correct').length / outcomes.length : 0;
    const edges = outcomes.map(e => e.metadata.edge).filter((e): e is number => e !== undefined);
    const avgEdge = edges.length ? edges.reduce((a, b) => a + b, 0) / edges.length : 0;
    const adjustedMagnitude = avgEdge * winRate;

    const hasStrongCatalyst = catalysts[0]?.confidence > 0.7;
    const hasHighEdge = adjustedMagnitude > 0.05 && winRate > 0.5;

    return {
      primaryCatalyst: catalysts[0] || { event: 'No clear catalyst', confidence: 0.3, evidence: [] },
      contributingFactors: catalysts.slice(1).map(c => ({ factor: c.event, weight: c.confidence * 0.5 })),
      historicalMatches: events.slice(0, 5).map(e => ({
        event: e.content.substring(0, 60) + '...',
        date: new Date(e.metadata.timestamp).toLocaleDateString(),
        outcome: e.metadata.outcome === 'correct' ? 'Success' : e.metadata.outcome === 'incorrect' ? 'Failure' : 'Pending',
        edge: e.metadata.edge
      })),
      edgeEstimate: {
        magnitude: Math.abs(adjustedMagnitude),
        direction: query.priceMove.magnitude > 0 ? 'up' : 'down',
        confidence: winRate,
        reasoning: `Based on ${outcomes.length} similar events with ${Math.round(winRate * 100)}% win rate`
      },
      recommendation: {
        action: hasStrongCatalyst && hasHighEdge ? 'predict' : hasHighEdge ? 'monitor' : 'dismiss',
        rationale: hasStrongCatalyst && hasHighEdge ? 'High edge with clear catalyst' : hasHighEdge ? 'Edge present but catalyst unclear' : 'Insufficient edge or catalyst',
        urgency: hasStrongCatalyst && hasHighEdge ? 'immediate' : hasHighEdge ? 'hours' : 'days'
      }
    };
  }
}

// ============================================
// FACTORY
// ============================================
export function createKBEngine() {
  const vectorStore = new KBVectorStore();
  const causationEngine = new CausationEngine(vectorStore);
  return { vectorStore, causationEngine };
}

// ============================================
// DEFAULT PATTERNS (Pre-seeded data)
// ============================================
export const defaultPatterns: KBEntry[] = [
  {
    id: 'pattern-001',
    content: 'FDA PDUFA approaching within 7 days with favorable adcom vote. 85% approval rate.',
    metadata: { type: 'pattern', domain: 'biotech', asset: 'generic', timestamp: 1704067200000 }
  },
  {
    id: 'pattern-002',
    content: 'FDA Advisory Committee unanimous or near-unanimous positive vote (≥10-2). Strong predictor of approval.',
    metadata: { type: 'pattern', domain: 'biotech', asset: 'generic', timestamp: 1704067200001 }
  },
  {
    id: 'pattern-003',
    content: 'Phase 3 trial with p<0.001 efficacy and clean safety profile. High probability of regulatory success.',
    metadata: { type: 'pattern', domain: 'biotech', asset: 'generic', timestamp: 1704067200002 }
  },
  {
    id: 'pattern-004',
    content: 'Orphan drug designation with fast track and unmet medical need. Expedited approval pathway.',
    metadata: { type: 'pattern', domain: 'biotech', asset: 'generic', timestamp: 1704067200003 }
  },
  {
    id: 'pattern-005',
    content: 'Mixed Phase 2b results with safety concerns raised. Approval uncertainty elevated.',
    metadata: { type: 'pattern', domain: 'biotech', asset: 'generic', timestamp: 1704067200004 }
  },
  {
    id: 'pattern-006',
    content: 'Election polling margin within 3 points in final week. High volatility expected.',
    metadata: { type: 'pattern', domain: 'geopolitics', asset: 'generic', timestamp: 1704067200005 }
  },
  {
    id: 'pattern-007',
    content: 'Major exchange listing announcement for crypto asset. Short-term price appreciation typical.',
    metadata: { type: 'pattern', domain: 'crypto', asset: 'generic', timestamp: 1704067200006 }
  },
  // Historical predictions for win rate calculation
  {
    id: 'pred-001',
    content: 'Predicted YES on X-305 approval. Strong Phase 3 (94% efficacy), favorable adcom (12-1 vote).',
    metadata: { type: 'prediction', domain: 'biotech', asset: 'X-305', timestamp: 1709424000000, outcome: 'correct', edge: 0.26 }
  },
  {
    id: 'pred-002',
    content: 'Predicted YES on Y-102 approval. Phase 3 topline p<0.001 with 89% efficacy.',
    metadata: { type: 'prediction', domain: 'biotech', asset: 'Y-102', timestamp: 1712016000000, outcome: 'correct', edge: 0.18 }
  },
  {
    id: 'pred-003',
    content: 'Predicted NO on Z-440 approval. Mixed Phase 2b, safety concerns.',
    metadata: { type: 'prediction', domain: 'biotech', asset: 'Z-440', timestamp: 1714608000000, outcome: 'incorrect', edge: -0.15 }
  },
  {
    id: 'pred-004',
    content: 'Predicted YES on W-221 approval. Orphan drug, fast track, unmet need.',
    metadata: { type: 'prediction', domain: 'biotech', asset: 'W-221', timestamp: 1714608000000, outcome: 'correct', edge: 0.22 }
  },
  {
    id: 'pred-005',
    content: 'Predicted YES on Crypto ETF approval. SEC changing stance after court ruling.',
    metadata: { type: 'prediction', domain: 'crypto', asset: 'BTC-ETF', timestamp: 1704067200000, outcome: 'correct', edge: 0.35 }
  }
];

// ============================================
// LOCALSTORAGE KEY
// ============================================
export const KB_STORAGE_KEY = 'kb-causation-engine-data';
