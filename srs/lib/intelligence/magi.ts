// MAGI Tripartite System - Multi-Parallel Intelligence Processing
// Based on Evangelion's MAGI supercomputer architecture

export type MagiNode = 'MELCHIOR-1' | 'BALTHASAR-2' | 'CASPER-3';

export type MagiVerdict = 'APPROVED' | 'REJECTED' | 'UNDETERMINED' | 'PROCESSING';

export interface MagiAnalysis {
  node: MagiNode;
  role: string;
  verdict: MagiVerdict;
  confidence: number; // 0-100
  data: {
    primaryMetric: string;
    secondaryMetrics: string[];
    reasoning: string;
  };
}

export interface MagiConsensus {
  melchior: MagiAnalysis;  // Scientific/Logical
  balthasar: MagiAnalysis; // Ethical/Human
  casper: MagiAnalysis;    // Practical/Actionable
  consensus: 'UNANIMOUS' | 'MAJORITY' | 'DISSENT' | 'SPLIT';
  timestamp: string;
}

// MAGI Node Configuration
export const MAGI_NODES: Record<MagiNode, { name: string; role: string; description: string }> = {
  'MELCHIOR-1': {
    name: 'MELCHIOR-1',
    role: 'Scientific/Logical',
    description: 'Technical analysis, price action, volatility metrics'
  },
  'BALTHASAR-2': {
    name: 'BALTHASAR-2',
    role: 'Ethical/Human',
    description: 'Sentiment analysis, political factors, social indicators'
  },
  'CASPER-3': {
    name: 'CASPER-3',
    role: 'Practical/Actionable',
    description: 'Execution strategy, risk assessment, timing'
  }
};

// Map harvest data to MAGI analysis
export function mapToMAGI(
  priceData: { volatility: number; trend: string; rsi: number },
  sentimentData: { sentiment: string; strength: number; divergence: number },
  executionData: { liquidity: number; spread: number; recommendation: string }
): MagiConsensus {
  const now = new Date().toISOString();

  // MELCHIOR-1: Scientific/Logical Analysis
  const melchior: MagiAnalysis = {
    node: 'MELCHIOR-1',
    role: 'Scientific/Logical',
    verdict: determineScientificVerdict(priceData),
    confidence: Math.min(100, Math.round(70 + priceData.volatility * 10)),
    data: {
      primaryMetric: `Volatility: ${(priceData.volatility * 100).toFixed(1)}%`,
      secondaryMetrics: [
        `RSI: ${priceData.rsi.toFixed(0)}`,
        `Trend: ${priceData.trend.toUpperCase()}`
      ],
      reasoning: `Technical indicators suggest ${priceData.trend} momentum with ${priceData.volatility > 0.3 ? 'high' : 'moderate'} volatility.`
    }
  };

  // BALTHASAR-2: Ethical/Human Analysis
  const balthasar: MagiAnalysis = {
    node: 'BALTHASAR-2',
    role: 'Ethical/Human',
    verdict: determineSentimentVerdict(sentimentData),
    confidence: sentimentData.strength,
    data: {
      primaryMetric: `Sentiment: ${sentimentData.sentiment.toUpperCase()}`,
      secondaryMetrics: [
        `Strength: ${sentimentData.strength.toFixed(0)}%`,
        `Divergence: ${sentimentData.divergence.toFixed(1)}%`
      ],
      reasoning: `News sentiment is ${sentimentData.sentiment} with ${sentimentData.divergence > 10 ? 'significant' : 'minimal'} market divergence.`
    }
  };

  // CASPER-3: Practical/Actionable Analysis
  const casper: MagiAnalysis = {
    node: 'CASPER-3',
    role: 'Practical/Actionable',
    verdict: determineExecutionVerdict(executionData),
    confidence: Math.min(100, Math.round(executionData.liquidity / 10000)),
    data: {
      primaryMetric: `Liquidity: $${(executionData.liquidity / 1000000).toFixed(2)}M`,
      secondaryMetrics: [
        `Spread: ${(executionData.spread * 100).toFixed(2)}%`,
        `Action: ${executionData.recommendation}`
      ],
      reasoning: `Execution ${executionData.recommendation.toLowerCase()} based on liquidity depth and spread analysis.`
    }
  };

  // Calculate consensus
  const verdicts = [melchior.verdict, balthasar.verdict, casper.verdict];
  const approved = verdicts.filter(v => v === 'APPROVED').length;
  const rejected = verdicts.filter(v => v === 'REJECTED').length;

  let consensus: MagiConsensus['consensus'];
  if (approved === 3) consensus = 'UNANIMOUS';
  else if (approved >= 2) consensus = 'MAJORITY';
  else if (rejected >= 2) consensus = 'DISSENT';
  else consensus = 'SPLIT';

  return {
    melchior,
    balthasar,
    casper,
    consensus,
    timestamp: now
  };
}

// Helper functions for verdict determination
function determineScientificVerdict(data: { volatility: number; trend: string; rsi: number }): MagiVerdict {
  if (data.rsi < 30 || data.rsi > 70) return 'APPROVED';
  if (data.volatility > 0.5) return 'UNDETERMINED';
  return 'REJECTED';
}

function determineSentimentVerdict(data: { sentiment: string; strength: number; divergence: number }): MagiVerdict {
  if (data.divergence > 15 && data.strength > 60) return 'APPROVED';
  if (data.divergence < 5) return 'REJECTED';
  return 'UNDETERMINED';
}

function determineExecutionVerdict(data: { liquidity: number; spread: number; recommendation: string }): MagiVerdict {
  if (data.recommendation === 'BUY' || data.recommendation === 'STRONG_BUY') return 'APPROVED';
  if (data.recommendation === 'SELL' || data.recommendation === 'AVOID') return 'REJECTED';
  return 'UNDETERMINED';
}

// Generate consensus summary
export function getConsensusSummary(consensus: MagiConsensus): string {
  switch (consensus.consensus) {
    case 'UNANIMOUS':
      return 'MAGI CONSENSUS ACHIEVED';
    case 'MAJORITY':
      return 'MAGI MAJORITY APPROVAL';
    case 'DISSENT':
      return 'MAGI DISSENT DETECTED';
    case 'SPLIT':
      return 'MAGI SPLIT DECISION';
    default:
      return 'MAGI PROCESSING...';
  }
}

// Get consensus color
export function getConsensusColor(consensus: MagiConsensus['consensus']): string {
  switch (consensus) {
    case 'UNANIMOUS':
      return 'var(--data-green)';
    case 'MAJORITY':
      return 'var(--wire-cyan)';
    case 'DISSENT':
      return 'var(--alert-red)';
    case 'SPLIT':
      return 'var(--nerv-orange)';
    default:
      return 'var(--steel-dim)';
  }
}
