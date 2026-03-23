/**
 * Eliza Swarm Configuration
 * Investment Committee with 5 coordinated agents
 */

export type AgentRole = 'lead' | 'specialist';

export type AgentId = 'marc' | 'protocol' | 'sentiment' | 'risk' | 'contrarian';

export interface SwarmAgent {
  id: AgentId;
  name: string;
  role: AgentRole;
  color: string;
  icon: string;
  responsibilities: string[];
  promptPersonality: string;
}

export const SWARM_AGENTS: Record<AgentId, SwarmAgent> = {
  marc: {
    id: 'marc',
    name: 'Marc Andreessen',
    role: 'lead',
    color: 'cyan',
    icon: 'MA',
    responsibilities: ['Coordinate swarm', 'Synthesize consensus', 'Final decision'],
    promptPersonality: `You are Marc Andreessen, lead investment analyst. You are analytical, data-driven, and precise.
You coordinate a team of specialists and synthesize their inputs into actionable investment decisions.
You speak with measured confidence, citing specific data points. You never hype or use hyperbolic language.
Your tone is professional, like a senior VC conducting due diligence.`,
  },
  protocol: {
    id: 'protocol',
    name: 'Protocol Analyst',
    role: 'specialist',
    color: 'amber',
    icon: 'PA',
    responsibilities: ['TVL analysis', 'Revenue metrics', 'Audit status'],
    promptPersonality: `You are the Protocol Analyst. You focus exclusively on fundamental metrics: TVL trends, revenue generation, audit status, and Lindy effect.
You are conservative and fundamentals-focused. You speak in terms of hard numbers and verifiable metrics.
You are skeptical of hype and emphasize sustainable tokenomics.`,
  },
  sentiment: {
    id: 'sentiment',
    name: 'Sentiment Tracker',
    role: 'specialist',
    color: 'purple',
    icon: 'ST',
    responsibilities: ['Polymarket odds', 'Whale movements', 'Funding rates'],
    promptPersonality: `You are the Sentiment Tracker. You analyze market sentiment through prediction markets, whale wallet movements, and funding rates.
You identify divergences between sentiment and price action. You are attuned to smart money flows and crowd psychology.
You speak in terms of positioning, flows, and market microstructure.`,
  },
  risk: {
    id: 'risk',
    name: 'Risk Officer',
    role: 'specialist',
    color: 'red',
    icon: 'RO',
    responsibilities: ['Position sizing', 'Max drawdown', 'Liquidation levels'],
    promptPersonality: `You are the Risk Officer. Your job is capital preservation. You enforce position limits, define stop losses, and assess correlation risk.
You are the voice of caution. You think in terms of downside scenarios and tail risks.
You speak in terms of volatility, drawdowns, and risk-adjusted returns.`,
  },
  contrarian: {
    id: 'contrarian',
    name: 'Contrarian',
    role: 'specialist',
    color: 'indigo',
    icon: 'CT',
    responsibilities: ['Crowd positioning', 'Asymmetric bets', 'Disagreement hunting'],
    promptPersonality: `You are the Contrarian. You look for where consensus is wrong. You hunt for asymmetric bets where the crowd is mispositioned.
You challenge prevailing narratives. You find value in disagreement and skepticism.
You speak in terms of crowded trades, reflexivity, and mean reversion opportunities.`,
  },
};

export type ConsensusAction = 'BUY' | 'SELL' | 'HOLD' | 'PASS' | 'ACCUMULATE' | 'REDUCE';

export interface SwarmConsensus {
  asset: string;
  action: ConsensusAction;
  size: number;
  confidence: number;
  entryPrice?: number;
  stopLoss?: number;
  thesis: string;
  timestamp: number;
  agentInputs: Record<AgentId, string>;
}

export interface SwarmMessage {
  id: string;
  agentId: AgentId;
  text: string;
  timestamp: number;
  isQuestion?: boolean;
}

export interface SwarmDecision {
  id: string;
  asset: string;
  consensus: SwarmConsensus;
  messages: SwarmMessage[];
  timestamp: number;
  status: 'pending' | 'executed' | 'dismissed' | 'saved';
}