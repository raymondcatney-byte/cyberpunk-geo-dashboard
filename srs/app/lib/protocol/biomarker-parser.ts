export interface ParsedBiomarkers {
  sleep?: number;
  hrv?: number;
  readiness?: number;
  subjective?: string;
}

export const extractBiomarkers = (input: string): ParsedBiomarkers => {
  const result: ParsedBiomarkers = {};
  const lowerInput = input.toLowerCase();
  
  // Sleep patterns: "6 hours", "6h sleep", "slept 6.5"
  const sleepMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:hours?|h)\s*(?:sleep|slept)?/i) ||
                     input.match(/slept\s*(\d+(?:\.\d+)?)/i) ||
                     input.match(/sleep\s*(\d+(?:\.\d+)?)/i);
  if (sleepMatch) result.sleep = parseFloat(sleepMatch[1]);
  
  // HRV patterns: "HRV 52", "HRV: 48", "hrv is 55"
  const hrvMatch = input.match(/hrv\s*(?::|is|was)?\s*(\d+)/i);
  if (hrvMatch) result.hrv = parseInt(hrvMatch[1]);
  
  // Readiness patterns: "readiness 8", "readiness: 7"
  const readinessMatch = input.match(/readiness\s*(?::|is|was)?\s*(\d+)/i);
  if (readinessMatch) result.readiness = parseInt(readinessMatch[1]);
  
  // Subjective feelings
  const subjectivePatterns = [
    'inflamed', 'sore', 'wrecked', 'destroyed', 'tired', 'fatigued',
    'great', 'excellent', 'good', 'amazing', 'strong', 'sharp',
    'stressed', 'anxious', 'calm', 'relaxed'
  ];
  result.subjective = subjectivePatterns.find(p => lowerInput.includes(p));
  
  return result;
};

export const formatBiomarkersForPrompt = (biomarkers: ParsedBiomarkers): string => {
  const parts: string[] = [];
  if (biomarkers.sleep !== undefined) parts.push(`sleep: ${biomarkers.sleep}h`);
  if (biomarkers.hrv !== undefined) parts.push(`HRV: ${biomarkers.hrv}`);
  if (biomarkers.readiness !== undefined) parts.push(`readiness: ${biomarkers.readiness}/10`);
  if (biomarkers.subjective) parts.push(`state: ${biomarkers.subjective}`);
  
  return parts.length > 0 ? `[Biomarkers: ${parts.join(', ')}] ` : '';
};
