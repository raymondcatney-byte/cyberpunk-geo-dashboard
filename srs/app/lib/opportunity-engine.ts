import { KNOWLEDGE_BASE } from '../config/knowledgeBase';
import type {
  TradingEnergySignal,
  TradingKalshiMarket,
  TradingPolymarketMarket,
  TradingSnapshot,
  TradingWatchtowerItem,
  TradingYieldPool,
} from './trading-intel';

export interface PredictionMarketOpportunity {
  id: string;
  venue: 'polymarket' | 'kalshi' | 'spread';
  title: string;
  impliedProbability: number;
  fairValue: number;
  edge: number;
  confidence: number;
  liquidity: number;
  category: string;
  thesis: string;
  catalysts: string[];
  tags: string[];
  relatedVenue?: string;
}

export interface YieldDislocationSignal {
  id: string;
  symbol: string;
  project: string;
  chain: string;
  apy: number;
  classification: 'sustainable' | 'incentive' | 'stressed';
  score: number;
  rationale: string;
}

export interface PaperTradeIdea {
  id: string;
  title: string;
  domain: 'prediction' | 'yield';
  action: 'buy' | 'sell' | 'monitor';
  confidence: number;
  edge: number;
  rationale: string;
  invalidation: string;
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function matchKnowledge(title: string) {
  const titleTokens = new Set(tokenize(title));
  return KNOWLEDGE_BASE
    .map((item) => {
      const itemTokens = new Set(tokenize(`${item.title} ${item.summary} ${item.tags.join(' ')}`));
      let overlap = 0;
      for (const token of titleTokens) {
        if (itemTokens.has(token)) overlap += 1;
      }
      return { item, overlap };
    })
    .filter((result) => result.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 3);
}

function matchCatalysts(title: string, watchtower: TradingWatchtowerItem[]) {
  const titleTokens = tokenize(title);
  return watchtower
    .map((item) => {
      const haystack = `${item.title} ${(item.tags || []).join(' ')}`.toLowerCase();
      const overlap = titleTokens.filter((token) => haystack.includes(token)).length;
      return { item, overlap };
    })
    .filter((result) => result.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 3)
    .map((result) => result.item.title);
}

function matchEnergyCatalysts(title: string, energy: TradingEnergySignal[]) {
  const titleTokens = tokenize(title);
  return energy
    .map((signal) => {
      const haystack = `${signal.region} ${signal.summary} ${signal.category}`.toLowerCase();
      const overlap = titleTokens.filter((token) => haystack.includes(token)).length;
      return { signal, overlap };
    })
    .filter((result) => result.overlap > 0 || result.signal.stressScore >= 64)
    .sort((a, b) => (b.overlap * 10 + b.signal.stressScore) - (a.overlap * 10 + a.signal.stressScore))
    .slice(0, 2)
    .map((result) => `${result.signal.region}: ${result.signal.summary}`);
}

function similarityScore(a: string, b: string) {
  const aTokens = new Set(tokenize(a));
  const bTokens = new Set(tokenize(b));
  if (!aTokens.size || !bTokens.size) return 0;
  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  return overlap / Math.max(1, Math.min(aTokens.size, bTokens.size));
}

function findBestKalshiMatch(market: TradingPolymarketMarket, kalshi: TradingKalshiMarket[]) {
  return kalshi
    .map((candidate) => ({
      candidate,
      score: similarityScore(market.title, `${candidate.title} ${candidate.subtitle || ''}`),
    }))
    .filter((result) => result.score >= 0.28)
    .sort((a, b) => b.score - a.score)[0];
}

export function scorePredictionOpportunities(snapshot: TradingSnapshot | null): PredictionMarketOpportunity[] {
  if (!snapshot) return [];

  return snapshot.polymarket
    .map((market) => {
      const knowledge = matchKnowledge(market.title);
      const catalysts = [
        ...matchCatalysts(market.title, snapshot.watchtower),
        ...matchEnergyCatalysts(market.title, snapshot.energy),
      ].slice(0, 4);
      const bestKalshiMatch = findBestKalshiMatch(market, snapshot.kalshi);
      const knowledgeStrength = knowledge.reduce((sum, match) => sum + match.overlap, 0);
      const catalystStrength = catalysts.length;
      const liquidityScore = Math.min(20, Math.log10(market.liquidity + 1) * 4);
      const timeScore = market.endDate ? 8 : 4;
      const spreadSignal = bestKalshiMatch ? bestKalshiMatch.candidate.yesPrice - market.yesPrice : 0;
      const fairValue = Math.max(
        0.05,
        Math.min(0.95, market.yesPrice + ((knowledgeStrength * 0.02) + (catalystStrength * 0.025) + (spreadSignal * 0.45) - 0.03))
      );
      const edge = fairValue - market.yesPrice;
      const confidence = Math.min(95, 45 + knowledgeStrength * 6 + catalystStrength * 8 + liquidityScore / 2 + Math.abs(spreadSignal) * 60);
      const thesisMatches = knowledge.map((match) => match.item.title);
      const spreadSummary =
        bestKalshiMatch && Math.abs(spreadSignal) >= 0.035
          ? [`Kalshi divergence ${(spreadSignal * 100).toFixed(1)} pts versus matched contract`]
          : [];

      return {
        id: market.id,
        venue: bestKalshiMatch && Math.abs(spreadSignal) >= 0.035 ? 'spread' as const : 'polymarket' as const,
        title: market.title,
        impliedProbability: market.yesPrice,
        fairValue,
        edge,
        confidence,
        liquidity: market.liquidity,
        category: market.category || 'General',
        thesis: thesisMatches[0] || (bestKalshiMatch ? 'Cross-venue divergence versus Kalshi and live catalyst stack' : 'Live catalyst divergence versus event pricing'),
        catalysts: [...spreadSummary, ...catalysts],
        tags: knowledge.flatMap((match) => match.item.tags).slice(0, 6),
        relatedVenue: bestKalshiMatch ? `Kalshi ${bestKalshiMatch.candidate.ticker}` : undefined,
        sortScore: Math.abs(edge) * 100 + confidence + liquidityScore + timeScore + Math.abs(spreadSignal) * 100,
      };
    })
    .filter((opportunity) => Math.abs(opportunity.edge) >= 0.04)
    .sort((a, b) => b.sortScore - a.sortScore)
    .slice(0, 6)
    .map(({ sortScore, ...opportunity }) => opportunity);
}

export function scoreYieldDislocations(snapshot: TradingSnapshot | null): YieldDislocationSignal[] {
  if (!snapshot) return [];

  const energyPressure = snapshot.energy.length
    ? snapshot.energy.reduce((sum, signal) => sum + signal.stressScore, 0) / snapshot.energy.length
    : 50;

  return snapshot.yields
    .map((pool: TradingYieldPool) => {
      const rewardRatio = pool.apy > 0 ? (pool.apyReward || 0) / pool.apy : 0;
      const classification: YieldDislocationSignal['classification'] =
        pool.apy > 18 && rewardRatio > 0.45 ? 'incentive' :
        pool.apy > 20 && pool.tvl < 25_000_000 ? 'stressed' :
        'sustainable';
      const score =
        (pool.viabilityScore || 0) +
        (classification === 'sustainable' ? 12 : classification === 'incentive' ? 6 : 3) +
        Math.min(10, Math.log10(pool.tvl + 1) * 2) +
        (pool.project.toLowerCase().includes('energy') || pool.symbol.toLowerCase().includes('power') ? (energyPressure - 50) / 6 : 0);
      const rationale =
        classification === 'sustainable'
          ? 'Base yield and TVL suggest the carry is supported by real protocol activity.'
          : classification === 'incentive'
            ? 'Rewards appear to be doing most of the work; monitor emissions and mercenary liquidity.'
            : 'High headline APY with weaker depth suggests reflexive or stressed pricing.';

      return {
        id: pool.id,
        symbol: pool.symbol,
        project: pool.project,
        chain: pool.chain,
        apy: pool.apy,
        classification,
        score,
        rationale,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

export function buildPaperTradeIdeas(
  opportunities: PredictionMarketOpportunity[],
  yields: YieldDislocationSignal[]
): PaperTradeIdea[] {
  const marketIdeas = opportunities.slice(0, 3).map((opportunity) => ({
    id: `paper-${opportunity.id}`,
    title: opportunity.title,
    domain: 'prediction' as const,
    action: opportunity.edge > 0 ? 'buy' as const : 'sell' as const,
    confidence: opportunity.confidence,
    edge: Math.abs(opportunity.edge) * 100,
    rationale: `${opportunity.thesis}. ${opportunity.catalysts[0] || 'Catalyst stack is still building.'}`,
    invalidation: 'Exit if catalyst narrative fades, liquidity collapses, or probability converges to fair value without fresh confirmation.',
  }));

  const yieldIdeas = yields.slice(0, 2).map((signal) => ({
    id: `yield-${signal.id}`,
    title: `${signal.project} ${signal.symbol}`,
    domain: 'yield' as const,
    action: signal.classification === 'stressed' ? 'monitor' as const : 'buy' as const,
    confidence: Math.min(88, Math.round(signal.score * 2)),
    edge: signal.apy,
    rationale: signal.rationale,
    invalidation: 'Stand down if emissions dominate yield, TVL breaks lower, or whale flows turn decisively risk-off.',
  }));

  return [...marketIdeas, ...yieldIdeas];
}