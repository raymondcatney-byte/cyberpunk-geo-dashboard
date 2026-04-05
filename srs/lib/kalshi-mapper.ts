/**
 * Kalshi Topic Mapper
 * Maps Kalshi market data to the 7-topic NERV taxonomy
 */

export type Topic = 'geopolitics' | 'ai' | 'crypto' | 'economy' | 'finance' | 'science' | 'tech';

export const TOPIC_KEYS: Topic[] = [
  'geopolitics',
  'ai',
  'crypto',
  'economy',
  'finance',
  'science',
  'tech'
];

// Kalshi series IDs mapped to topics
export const KALSHI_TOPIC_MAPPING: Record<Topic, string[]> = {
  geopolitics: ['CONGRESS', 'PRES', 'SUPREME-COURT', 'IMPEACH', 'WAR', 'ELECTION'],
  ai: ['AI', 'TECH-REGULATION', 'OPENAI', 'ANTHROPIC'],
  crypto: ['CRYPTO', 'BTC', 'ETH', 'BITCOIN', 'ETHEREUM'],
  economy: ['CPI', 'FED', 'GDP', 'UNEMPLOYMENT', 'INFLATION', 'RECESSION', 'RATES'],
  finance: ['STOCKS', 'SPX', 'NASDAQ', 'BANKS', 'MARKETS'],
  science: ['CLIMATE', 'SPACE', 'FDA', 'PANDEMIC', 'CARBON'],
  tech: ['TECH-EARNINGS', 'ANTITRUST', 'BIG-TECH', 'NVDA', 'APPLE', 'GOOGLE']
};

// Keyword detection for category classification
export const KEYWORD_MAP: Record<string, Topic> = {
  // Crypto
  'bitcoin': 'crypto',
  'btc': 'crypto',
  'ethereum': 'crypto',
  'eth': 'crypto',
  'crypto': 'crypto',
  'defi': 'crypto',
  'etf': 'crypto',
  
  // Economy
  'fed': 'economy',
  'interest': 'economy',
  'inflation': 'economy',
  'cpi': 'economy',
  'recession': 'economy',
  'gdp': 'economy',
  'unemployment': 'economy',
  'rates': 'economy',
  
  // Geopolitics
  'trump': 'geopolitics',
  'biden': 'geopolitics',
  'election': 'geopolitics',
  'war': 'geopolitics',
  'ukraine': 'geopolitics',
  'israel': 'geopolitics',
  'iran': 'geopolitics',
  'china': 'geopolitics',
  'president': 'geopolitics',
  'congress': 'geopolitics',
  
  // AI
  'ai': 'ai',
  'artificial intelligence': 'ai',
  'openai': 'ai',
  'chatgpt': 'ai',
  'claude': 'ai',
  'llm': 'ai',
  
  // Finance
  'stock': 'finance',
  'sp500': 'finance',
  'nasdaq': 'finance',
  's&p': 'finance',
  'market cap': 'finance',
  
  // Science
  'climate': 'science',
  'carbon': 'science',
  'space': 'science',
  'fda': 'science',
  'vaccine': 'science',
  
  // Tech
  'apple': 'tech',
  'google': 'tech',
  'nvidia': 'tech',
  'nvda': 'tech',
  'tesla': 'tech',
  'microsoft': 'tech',
  'amazon': 'tech',
  'tech': 'tech'
};

/**
 * Detect topic from market title/series ID
 */
export function detectTopic(title: string, seriesId?: string): Topic | null {
  const lowerTitle = title.toLowerCase();
  
  // 1. Check direct keyword match first
  for (const [keyword, topic] of Object.entries(KEYWORD_MAP)) {
    if (lowerTitle.includes(keyword)) return topic;
  }
  
  // 2. Check Series ID mapping (if provided)
  if (seriesId) {
    const upperSeries = seriesId.toUpperCase();
    for (const [topic, seriesList] of Object.entries(KALSHI_TOPIC_MAPPING)) {
      if (seriesList.some(s => upperSeries.includes(s))) {
        return topic as Topic;
      }
    }
  }
  
  return null;
}

/**
 * Get display name for topic
 */
export function getTopicDisplayName(topic: Topic): string {
  const displayNames: Record<Topic, string> = {
    geopolitics: 'Geopolitics',
    ai: 'AI',
    crypto: 'Crypto',
    economy: 'Economy',
    finance: 'Finance',
    science: 'Science',
    tech: 'Tech'
  };
  return displayNames[topic] || topic;
}

/**
 * Get topic color for UI
 */
export function getTopicColor(topic: Topic): string {
  const colors: Record<Topic, string> = {
    geopolitics: '#ef4444', // Red
    ai: '#a855f7',          // Purple
    crypto: '#f59e0b',      // Amber
    economy: '#10b981',     // Green
    finance: '#3b82f6',     // Blue
    science: '#06b6d4',     // Cyan
    tech: '#ec4899'         // Pink
  };
  return colors[topic] || '#666666';
}
