// Enhanced Search Module for Polymarket
// Supports fuzzy matching, stemming, and relevance scoring within configured topics

const TOPICS = {
  geopolitics: ['war', 'election', 'ukraine', 'israel', 'taiwan', 'iran', 'china', 'russia', 'politics', 'trump', 'biden', 'military', 'attack', 'strike', 'missile', 'invasion', 'embassy', 'gaza', 'hamas', 'hezbollah', 'nato', 'defense', 'ceasefire', 'peace', 'negotiation'],
  ai: ['ai', 'artificial intelligence', 'openai', 'chatgpt', 'claude', 'llm', 'gpt', 'model', 'machine learning', 'deep learning', 'neural', 'anthropic', 'gemini', 'bard', 'alignment', 'agi'],
  crypto: ['crypto', 'bitcoin', 'ethereum', 'btc', 'eth', 'etf', 'sec', 'coinbase', 'binance', 'blockchain', 'token', 'altcoin', 'cryptocurrency', 'solana', 'cardano', 'ripple', 'xrp', 'defi'],
  economy: ['recession', 'inflation', 'gdp', 'economy', 'unemployment', 'jobs', 'fed', 'interest rate', 'federal reserve', 'cpi', 'economic', 'ppi', 'retail sales', 'consumer'],
  finance: ['stock', 'market', 'nasdaq', 'sp500', 'dow', 'bank', 'finance', 'trading', 'equity', 'bull', 'bear', 'rally', 'crash', 'hedge fund'],
  science: ['climate', 'space', 'vaccine', 'health', 'science', 'nasa', 'medical', 'covid', 'pandemic', 'research', 'study', 'cancer', 'treatment', 'drug', 'fda'],
  tech: ['apple', 'google', 'meta', 'tesla', 'microsoft', 'amazon', 'tech', 'product', 'iphone', 'android', 'app', 'software', 'hardware', 'semiconductor', 'nvidia', 'chip']
};

// Simple stemmer for English words (Porter stemmer lite)
function stem(word: string): string {
  let w = word.toLowerCase();
  
  // Remove plurals and -ed/-ing
  if (w.endsWith('sses')) w = w.slice(0, -2);
  else if (w.endsWith('ies')) w = w.slice(0, -2);
  else if (w.endsWith('ss')) w = w;
  else if (w.endsWith('s') && w.length > 3) w = w.slice(0, -1);
  
  if (w.endsWith('eed') && w.length > 4) w = w.slice(0, -1);
  else if (w.endsWith('ed') && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith('ing') && w.length > 5) w = w.slice(0, -3);
  
  // Common transformations
  if (w.endsWith('ational')) w = w.slice(0, -7) + 'e';
  else if (w.endsWith('tional')) w = w.slice(0, -6);
  else if (w.endsWith('ization')) w = w.slice(0, -7) + 'e';
  else if (w.endsWith('ication')) w = w.slice(0, -7) + 'e';
  
  return w;
}

// Expand search term with related words and stems
function expandSearchTerm(term: string): string[] {
  const lower = term.toLowerCase().trim();
  if (!lower) return [];
  
  const expansions = new Set<string>();
  expansions.add(lower);
  expansions.add(stem(lower));
  
  // Add common variations
  if (lower.endsWith('y')) {
    expansions.add(lower.slice(0, -1) + 'ies');
    expansions.add(lower.slice(0, -1) + 'iness');
  }
  if (lower.endsWith('e')) {
    expansions.add(lower + 'd');
    expansions.add(lower + 'r');
  }
  if (!lower.endsWith('e') && !lower.endsWith('s')) {
    expansions.add(lower + 's');
    expansions.add(lower + 'es');
    expansions.add(lower + 'ing');
    expansions.add(lower + 'ed');
    expansions.add(lower + 'er');
  }
  
  // Add common synonyms/expansions for key terms
  const synonymMap: Record<string, string[]> = {
    'war': ['warfare', 'conflict', 'battle', 'fight', 'combat'],
    'election': ['electoral', 'vote', 'voting', 'ballot', 'poll'],
    'attack': ['assault', 'strike', 'bombing', 'raid'],
    'strike': ['attack', 'bombing', 'missile', 'airstrike'],
    'invasion': ['invade', 'occupation', 'incursion'],
    'peace': ['ceasefire', 'truce', 'armistice', 'accord'],
    'negotiation': ['negotiate', 'talks', 'deal', 'agreement', 'diplomacy'],
    'ai': ['artificial intelligence', 'machine intelligence'],
    'machine learning': ['ml', 'learning algorithm', 'predictive'],
    'deep learning': ['neural network', 'deep neural'],
    'bitcoin': ['btc', 'bitcoin cash'],
    'ethereum': ['eth', 'ethereum classic'],
    'crypto': ['cryptocurrency', 'digital currency', 'altcoin'],
    'stock': ['stocks', 'equity', 'shares'],
    'market': ['markets', 'trading', 'exchange'],
    'recession': ['recessionary', 'downturn', 'contraction'],
    'inflation': ['inflatory', 'price increase', 'cpi'],
    'climate': ['climate change', 'global warming', 'environmental'],
    'vaccine': ['vaccination', 'immunization', 'shot'],
    'covid': ['coronavirus', 'covid-19', 'sars-cov-2'],
    'tech': ['technology', 'technological'],
    'software': ['program', 'application', 'app'],
    'hardware': ['device', 'equipment', 'physical'],
    'chip': ['semiconductor', 'processor', 'cpu', 'gpu'],
  };
  
  if (synonymMap[lower]) {
    synonymMap[lower].forEach(syn => {
      expansions.add(syn);
      expansions.add(stem(syn));
    });
  }
  
  // Check if search term is contained in any topic keyword
  for (const keywords of Object.values(TOPICS)) {
    for (const keyword of keywords) {
      if (keyword.includes(lower) && keyword !== lower) {
        expansions.add(keyword);
        expansions.add(stem(keyword));
      }
      // Check for partial matches (e.g., "intelligen" matches "intelligence")
      if (stem(keyword).includes(stem(lower)) && stem(keyword) !== stem(lower)) {
        expansions.add(keyword);
      }
    }
  }
  
  return Array.from(expansions);
}

// Calculate similarity score between two strings (Levenshtein-based)
function similarityScore(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1: string, s2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[s2.length][s1.length];
}

// Detect topics in a question with relevance scoring
function detectTopicsWithScore(question: string, searchTerm?: string): Array<{ topic: string; score: number; matchedKeywords: string[] }> {
  const q = question.toLowerCase();
  const qStems = q.split(/\s+/).map(stem);
  const results: Array<{ topic: string; score: number; matchedKeywords: string[] }> = [];
  
  // If search term provided, use expanded terms for matching
  const searchExpansions = searchTerm ? expandSearchTerm(searchTerm) : [];
  
  for (const [topic, keywords] of Object.entries(TOPICS)) {
    let score = 0;
    const matchedKeywords: string[] = [];
    
    for (const keyword of keywords) {
      const keywordStem = stem(keyword);
      let matchScore = 0;
      
      // Exact match
      if (q.includes(keyword)) {
        matchScore = 1.0;
      }
      // Stem match
      else if (qStems.some(s => s === keywordStem) || q.includes(keywordStem)) {
        matchScore = 0.8;
      }
      // Search expansion match
      else if (searchExpansions.length > 0 && searchExpansions.some(exp => 
        keyword.includes(exp) || exp.includes(keyword) || stem(exp) === keywordStem
      )) {
        matchScore = 0.7;
      }
      // Fuzzy match (similarity > 0.7)
      else {
        const sim = similarityScore(keyword, q);
        if (sim > 0.7) {
          matchScore = sim * 0.8;
        }
      }
      
      if (matchScore > 0) {
        score += matchScore;
        if (!matchedKeywords.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
      }
    }
    
    if (score > 0) {
      results.push({ topic, score, matchedKeywords });
    }
  }
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  return results;
}

// Main search function - filters markets by search term within configured topics only
export function searchMarkets(markets: any[], searchTerm: string, limit: number = 50): any[] {
  if (!searchTerm || searchTerm.trim() === '') {
    return markets.slice(0, limit);
  }
  
  const expandedTerms = expandSearchTerm(searchTerm);
  const scoredMarkets: Array<{ market: any; score: number; topics: any[] }> = [];
  const searchLower = searchTerm.toLowerCase();
  
  for (const market of markets) {
    // Use combinedText if available (includes event title + question), otherwise fall back to question
    const question = (market.question || market.title || '').toLowerCase();
    const eventTitle = (market.eventTitle || '').toLowerCase();
    const slug = (market.slug || '').toLowerCase();
    const eventSlug = (market.eventSlug || '').toLowerCase();
    
    // Combined text for searching - includes event title, question, and slugs
    const combinedText = market.combinedText || `${eventTitle} ${question} ${slug} ${eventSlug}`;
    
    // First check if this market belongs to any of our configured topics
    // Search in both question and event title
    const topicMatches = detectTopicsWithScore(`${eventTitle} ${question}`, searchTerm);
    
    if (topicMatches.length === 0) {
      // Market doesn't match any configured topic, skip it
      continue;
    }
    
    // Check if ANY expanded search term appears in the combined text (required for inclusion)
    let hasDirectMatch = false;
    for (const term of expandedTerms) {
      if (combinedText.includes(term)) {
        hasDirectMatch = true;
        break;
      }
    }
    
    // Also check if the original search term appears anywhere
    const hasSearchTermMatch = combinedText.includes(searchLower);
    
    // If no direct match at all, skip this market
    if (!hasDirectMatch && !hasSearchTermMatch) {
      continue;
    }
    
    // Calculate relevance score
    let score = 0;
    
    // HEAVY bonus for exact search term match in question (highest priority)
    if (question.includes(searchLower)) {
      score += 10.0;
      // Extra bonus if it appears multiple times
      const occurrences = (question.match(new RegExp(searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      score += (occurrences - 1) * 2.0;
    }
    
    // Bonus for exact search term match in event title
    if (eventTitle.includes(searchLower)) {
      score += 8.0;
    }
    
    // Bonus for exact search term match in slug or event slug
    if (slug.includes(searchLower)) {
      score += 5.0;
    }
    if (eventSlug.includes(searchLower)) {
      score += 3.0;
    }
    
    // Score based on expanded term matches
    for (const term of expandedTerms) {
      if (term !== searchLower && combinedText.includes(term)) {
        score += 2.0;
      }
    }
    
    // Score based on topic relevance (secondary to keyword matching)
    for (const topicMatch of topicMatches) {
      // Only add topic score if the topic is relevant to the search
      const topicIsRelevant = topicMatch.matchedKeywords.some(k => 
        expandedTerms.some(et => et.includes(k) || k.includes(et))
      );
      if (topicIsRelevant) {
        score += topicMatch.score * 1.5;
      }
    }
    
    // Bonus for multiple relevant topic matches
    const relevantTopicCount = topicMatches.filter(t => 
      t.matchedKeywords.some(k => expandedTerms.some(et => et.includes(k) || k.includes(et)))
    ).length;
    if (relevantTopicCount > 1) {
      score += relevantTopicCount * 0.5;
    }
    
    // Fuzzy match bonus (lowest priority)
    const fuzzyScore = similarityScore(searchLower, combinedText);
    if (fuzzyScore > 0.6) {
      score += fuzzyScore * 0.5;
    }
    
    if (score > 0) {
      scoredMarkets.push({
        market,
        score,
        topics: topicMatches
      });
    }
  }
  
  // Sort by score descending
  scoredMarkets.sort((a, b) => b.score - a.score);
  
  // Return top results with metadata
  return scoredMarkets.slice(0, limit).map(item => ({
    ...item.market,
    _searchScore: item.score,
    _matchedTopics: item.topics.map(t => ({ topic: t.topic, score: t.score, keywords: t.matchedKeywords }))
  }));
}

// Get all markets filtered to only configured topics
export function filterByConfiguredTopics(markets: any[]): any[] {
  return markets.filter(market => {
    const question = market.question || market.title || '';
    const topicMatches = detectTopicsWithScore(question);
    return topicMatches.length > 0;
  });
}

// Export for API usage
export { TOPICS, detectTopicsWithScore, expandSearchTerm, stem };
