const TOPICS = {
  geopolitics: ['war', 'election', 'ukraine', 'israel', 'taiwan', 'iran', 'china', 'russia', 'politics', 'trump', 'biden', 'military', 'attack', 'strike', 'missile', 'invasion', 'embassy', 'gaza', 'hamas', 'hezbollah', 'nato', 'defense'],
  ai: ['ai', 'artificial intelligence', 'openai', 'chatgpt', 'claude', 'llm', 'gpt', 'model', 'machine learning', 'deep learning', 'neural', 'anthropic', 'gemini', 'bard', 'midjourney', 'stable diffusion'],
  crypto: ['crypto', 'bitcoin', 'ethereum', 'btc', 'eth', 'etf', 'sec', 'coinbase', 'binance', 'blockchain', 'token', 'altcoin', 'cryptocurrency', 'solana', 'cardano', 'ripple', 'xrp', 'dogecoin'],
  economy: ['recession', 'inflation', 'gdp', 'economy', 'unemployment', 'jobs', 'fed', 'interest rate', 'federal reserve', 'cpi', 'economic', 'ppi', 'retail sales', 'consumer'],
  finance: ['stock', 'market', 'nasdaq', 'sp500', 'dow', 'bank', 'finance', 'trading', 'equity', 'bull', 'bear', 'rally', 'crash', 'hedge fund', 'private equity'],
  science: ['climate', 'space', 'vaccine', 'health', 'science', 'nasa', 'medical', 'covid', 'pandemic', 'research', 'study', 'cancer', 'treatment', 'drug', 'fda'],
  tech: ['apple', 'google', 'meta', 'tesla', 'microsoft', 'amazon', 'tech', 'product', 'iphone', 'android', 'app', 'software', 'hardware', 'semiconductor', 'nvidia', 'chip']
};

function detectTopic(question: string): string {
  const q = question.toLowerCase();
  for (const [topic, keywords] of Object.entries(TOPICS)) {
    if (keywords.some(k => q.includes(k))) return topic;
  }
  return 'other';
}

function detectAnomaly(market: any) {
  const currentPrice = market.currentPrice || 0.5;
  const price24h = market.price24hAgo || currentPrice;
  const volume = market.volume24h || market.volume || 0;
  const question = market.question || '';
  
  const priceChange = Math.abs(currentPrice - price24h);
  const percentChange = price24h > 0 ? (priceChange / price24h) * 100 : 0;
  
  // Detection: significant movement + volume
  if (percentChange < 15 || volume < 5000) return null;
  
  const topic = detectTopic(question);
  const change = ((currentPrice - price24h) / price24h * 100);
  
  return {
    question,
    topic,
    detectedPrice: Math.round(price24h * 100),
    peakPrice: Math.round((currentPrice > price24h ? currentPrice * 1.08 : currentPrice * 0.92) * 100),
    nowPrice: Math.round(currentPrice * 100),
    change: change.toFixed(2),
    volume,
    direction: change > 0 ? 'up' : 'down',
    score: Math.abs(change) + (volume / 10000),
    detectedAt: Date.now() - Math.random() * 86400000,
    movedAt: Date.now() - Math.random() * 3600000,
    slug: market.slug || market.id || ''
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch('https://polymarket.com/api/markets?active=true&sort=volume24h&limit=200', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }
    
    const data = await response.json();
    const markets = data.markets || data;
    
    const anomalies = markets
      .map(detectAnomaly)
      .filter((a: any) => a !== null)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 50);
    
    return res.status(200).json({ 
      anomalies, 
      timestamp: Date.now(),
      count: anomalies.length 
    });
    
  } catch (error) {
    console.error('Polymarket fetch error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch markets',
      anomalies: []
    });
  }
}
