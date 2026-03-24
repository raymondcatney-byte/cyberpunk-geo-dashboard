export const ANOMALY_TOPICS = {
  geopolitics: {
    label: 'Geopolitics',
    keywords: ['war', 'election', 'ukraine', 'israel', 'taiwan', 'iran', 'china', 'russia', 'politics', 'trump', 'biden', 'military', 'attack', 'strike', 'missile', 'invasion', 'embassy', 'gaza', 'hamas', 'nato', 'putin', 'xi', 'north korea'],
  },
  ai: {
    label: 'AI',
    keywords: ['ai', 'artificial intelligence', 'openai', 'chatgpt', 'claude', 'llm', 'gpt', 'model', 'machine learning', 'deep learning', 'neural', 'anthropic', 'gemini', 'bard', 'copilot'],
  },
  crypto: {
    label: 'Crypto',
    keywords: ['crypto', 'bitcoin', 'ethereum', 'btc', 'eth', 'etf', 'sec', 'coinbase', 'binance', 'blockchain', 'token', 'altcoin', 'cryptocurrency', 'solana', 'cardano', 'ripple', 'xrp'],
  },
  economy: {
    label: 'Economy',
    keywords: ['recession', 'inflation', 'gdp', 'economy', 'unemployment', 'jobs', 'fed', 'interest rate', 'federal reserve', 'cpi', 'economic', 'deflation', 'stagflation', 'treasury'],
  },
  finance: {
    label: 'Finance',
    keywords: ['stock', 'market', 'nasdaq', 'sp500', 'dow', 'bank', 'finance', 'trading', 'equity', 'bull', 'bear', 'rally', 'crash', 'merger', 'ipo', 'dividend'],
  },
  science: {
    label: 'Science',
    keywords: ['climate', 'space', 'vaccine', 'health', 'science', 'nasa', 'medical', 'covid', 'pandemic', 'research', 'study', 'cancer', 'treatment', 'fda', 'mars', 'moon'],
  },
  tech: {
    label: 'Tech',
    keywords: ['apple', 'google', 'meta', 'tesla', 'microsoft', 'amazon', 'tech', 'product', 'iphone', 'android', 'app', 'software', 'hardware', 'nvidia', 'semiconductor', 'chip'],
  },
} as const;

export type TopicKey = keyof typeof ANOMALY_TOPICS;

export function detectTopic(question: string): TopicKey | 'other' {
  const q = question.toLowerCase();
  for (const [topic, data] of Object.entries(ANOMALY_TOPICS)) {
    if (data.keywords.some(k => q.includes(k.toLowerCase()))) {
      return topic as TopicKey;
    }
  }
  return 'other';
}

export const TOPIC_KEYS: TopicKey[] = Object.keys(ANOMALY_TOPICS) as TopicKey[];
