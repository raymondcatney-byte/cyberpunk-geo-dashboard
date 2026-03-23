/**
 * Swarm Memory - Persist decisions to localStorage
 */

import type { SwarmDecision, SwarmConsensus } from './swarm-config';

const SWARM_MEMORY_KEY = 'eliza-swarm-memory';
const MAX_MEMORY_ITEMS = 50;

export function loadSwarmMemory(): SwarmDecision[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(SWARM_MEMORY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('[SwarmMemory] Failed to load:', e);
    return [];
  }
}

export function saveSwarmMemory(decisions: SwarmDecision[]) {
  if (typeof window === 'undefined') return;
  try {
    // Keep only recent decisions
    const trimmed = decisions.slice(-MAX_MEMORY_ITEMS);
    localStorage.setItem(SWARM_MEMORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('[SwarmMemory] Failed to save:', e);
  }
}

export function addDecision(decision: SwarmDecision) {
  const memory = loadSwarmMemory();
  memory.push(decision);
  saveSwarmMemory(memory);
}

export function updateDecisionStatus(
  decisionId: string, 
  status: SwarmDecision['status']
) {
  const memory = loadSwarmMemory();
  const updated = memory.map(d => 
    d.id === decisionId ? { ...d, status } : d
  );
  saveSwarmMemory(updated);
}

export function clearSwarmMemory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SWARM_MEMORY_KEY);
}

export function getDecisionStats(): {
  total: number;
  buy: number;
  sell: number;
  hold: number;
  pass: number;
  avgConfidence: number;
} {
  const memory = loadSwarmMemory();
  const stats = {
    total: memory.length,
    buy: 0,
    sell: 0,
    hold: 0,
    pass: 0,
    avgConfidence: 0
  };
  
  let totalConfidence = 0;
  
  memory.forEach(d => {
    const action = d.consensus.action;
    if (action === 'BUY' || action === 'ACCUMULATE') stats.buy++;
    else if (action === 'SELL' || action === 'REDUCE') stats.sell++;
    else if (action === 'HOLD') stats.hold++;
    else if (action === 'PASS') stats.pass++;
    
    totalConfidence += d.consensus.confidence;
  });
  
  stats.avgConfidence = memory.length > 0 
    ? Math.round(totalConfidence / memory.length) 
    : 0;
  
  return stats;
}

export function getRecentDecisions(limit = 5): SwarmDecision[] {
  const memory = loadSwarmMemory();
  return memory.slice(-limit).reverse();
}

export function getDecisionsForAsset(asset: string): SwarmDecision[] {
  const memory = loadSwarmMemory();
  return memory
    .filter(d => d.asset.toLowerCase() === asset.toLowerCase())
    .reverse();
}
