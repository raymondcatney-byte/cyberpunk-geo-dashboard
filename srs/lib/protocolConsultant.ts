/**
 * Protocol Consultant - Wayne Protocol Integration
 * Biomarker parser and API client
 */

export interface ParsedBiomarkers {
  sleep?: number;
  hrv?: number;
  readiness?: number;
  subjective?: string;
}

export interface ConsultationResult {
  response: string;
  timestamp: string;
}

/**
 * Extract biomarkers from natural language input
 * Examples:
 * - "Slept 5 hours, HRV 48" → { sleep: 5, hrv: 48 }
 * - "feel wrecked, readiness 6/10" → { readiness: 6, subjective: 'wrecked' }
 */
export function extractBiomarkers(input: string): ParsedBiomarkers {
  const result: ParsedBiomarkers = {};
  const lowerInput = input.toLowerCase();

  // Sleep patterns - match: "5 hours sleep", "slept 7h", "6.5 hours"
  const sleepMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:hours?|h)\s*(?:sleep|slept)/i) ||
                     input.match(/(?:sleep|slept)\s*(?:for\s*)?(\d+(?:\.\d+)?)\s*(?:hours?|h)?/i);
  if (sleepMatch) {
    result.sleep = parseFloat(sleepMatch[1]);
  }

  // HRV patterns - match: "HRV 52", "HRV is 48", "hrv of 55"
  const hrvMatch = input.match(/hrv\s*(?:is|was|of|=|:)?\s*(\d+)/i);
  if (hrvMatch) {
    result.hrv = parseInt(hrvMatch[1]);
  }

  // Readiness patterns - match: "readiness 7", "readiness 8/10", "ready 9"
  const readinessMatch = input.match(/readiness\s*(?:is|was|of|=|:)?\s*(\d+)(?:\/10)?/i) ||
                         input.match(/(?:ready|readiness)\s+(\d+)(?:\/10)?/i);
  if (readinessMatch) {
    result.readiness = parseInt(readinessMatch[1]);
  }

  // Subjective feelings
  const subjectivePatterns = [
    'inflamed', 'sore', 'wrecked', 'tired', 'exhausted', 'fatigued',
    'great', 'excellent', 'good', 'amazing', 'strong', 'recovered',
    'stressed', 'anxious', 'relaxed', 'calm'
  ];
  
  for (const pattern of subjectivePatterns) {
    if (lowerInput.includes(pattern)) {
      result.subjective = pattern;
      break;
    }
  }

  return result;
}

/**
 * Format biomarkers for display
 */
export function formatBiomarkers(biomarkers: ParsedBiomarkers): string[] {
  const badges: string[] = [];
  
  if (biomarkers.sleep !== undefined) {
    const color = biomarkers.sleep < 6 ? 'text-red-400' : biomarkers.sleep < 7 ? 'text-yellow-400' : 'text-green-400';
    badges.push(`Sleep: ${biomarkers.sleep}h`);
  }
  
  if (biomarkers.hrv !== undefined) {
    const color = biomarkers.hrv < 50 ? 'text-red-400' : biomarkers.hrv < 60 ? 'text-yellow-400' : 'text-green-400';
    badges.push(`HRV: ${biomarkers.hrv}`);
  }
  
  if (biomarkers.readiness !== undefined) {
    const color = biomarkers.readiness < 5 ? 'text-red-400' : biomarkers.readiness < 7 ? 'text-yellow-400' : 'text-green-400';
    badges.push(`Readiness: ${biomarkers.readiness}/10`);
  }
  
  if (biomarkers.subjective) {
    badges.push(`State: ${biomarkers.subjective}`);
  }
  
  return badges;
}

/**
 * Get color for biomarker display
 */
export function getBiomarkerColor(type: keyof ParsedBiomarkers, value: number | string): string {
  if (type === 'sleep') {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num < 6) return '#ef4444'; // red
    if (num < 7) return '#eab308'; // yellow
    return '#22c55e'; // green
  }
  
  if (type === 'hrv') {
    const num = typeof value === 'string' ? parseInt(value) : value;
    if (num < 50) return '#ef4444';
    if (num < 60) return '#eab308';
    return '#22c55e';
  }
  
  if (type === 'readiness') {
    const num = typeof value === 'string' ? parseInt(value) : value;
    if (num < 5) return '#ef4444';
    if (num < 7) return '#eab308';
    return '#22c55e';
  }
  
  return '#a3a3a3';
}

/**
 * Call Protocol Consultant API
 */
export async function consultWayneProtocol(
  query: string,
  biomarkers?: ParsedBiomarkers
): Promise<ConsultationResult> {
  const response = await fetch('/api/protocol-consultant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, biomarkers })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Consultation failed');
  }

  const data = await response.json();
  return {
    response: data.response,
    timestamp: data.timestamp
  };
}

/**
 * Quick protocol templates
 */
export const PROTOCOL_TEMPLATES = [
  { label: 'Morning Routine', query: "What's my morning supplement stack and timing?" },
  { label: 'Pre-workout', query: "What should I take before training today?" },
  { label: 'Sleep <6h', query: 'Slept 5 hours, how do I adjust my protocol?' },
  { label: 'Recovery Day', query: 'HRV is low, what should I do today?' },
  { label: 'Hair Protocol', query: "What's the complete hair protocol?" },
  { label: 'Longevity Stack', query: 'What are my daily longevity supplements?' }
];
