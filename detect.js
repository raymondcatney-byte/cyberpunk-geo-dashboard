#!/usr/bin/env node
/**
 * Polymarket Anomaly Detector
 * Monitors 7 sectors for unusual volume and price movements
 * Run: node detect.js
 */

// Sector keyword mappings
const SECTORS = {
  GEOPOLITICS: ['war', 'israel', 'iran', 'ukraine', 'russia', 'china', 'taiwan', 'election', 'nato', 'sanction', 'invasion', 'ceasefire', 'treaty', 'gaza', 'hamas', 'hezbollah', 'missile', 'conflict'],
  AI: ['agi', 'ai', 'gpt', 'llm', 'openai', 'anthropic', 'deepmind', 'model', 'alignment', 'safety', 'regulation', 'artificial intelligence', 'claude', 'gemini'],
  DeFi: ['hack', 'exploit', 'defi', 'protocol', 'smart contract', 'dex', 'lending', 'stablecoin', 'sec', 'coinbase', 'binance', 'liquidation', 'crypto', 'bitcoin', 'ethereum'],
  COMMODITIES: ['gold', 'silver', 'copper', 'wheat', 'corn', 'supply chain', 'shortage', 'inventory', 'agriculture', 'metal', 'grain', 'commodity'],
  ENERGY: ['oil', 'gas', 'opec', 'pipeline', 'refinery', 'nuclear', 'electricity', 'power grid', 'lng', 'crude', 'brent', 'wti', 'saudi', 'energy'],
  BIOTECH: ['fda', 'trial', 'drug', 'vaccine', 'pandemic', 'approval', 'pdufa', 'clinical', 'biotech', 'pharma', 'moderna', 'pfizer', 'gene', 'therapy'],
  MACRO: ['fed', 'cpi', 'inflation', 'unemployment', 'recession', 'interest rate', 'gdp', 'treasury', 'yield', 'dollar', 'fomc', 'powell', 'rate cut', 'rate hike']
};

// Alert rate limiting (1 per 30 min per market)
const ALERT_COOLDOWN_MS = 30 * 60 * 1000;
const lastAlertTime = new Map();

// Market history storage (7-day rolling window)
const marketHistory = new Map();
const HISTORY_DAYS = 7;

// Minimum thresholds
const MIN_LIQUIDITY = 5000;
const MIN_VOLUME = 1000;

// Anomaly thresholds
const VOLUME_Z_THRESHOLD = 2.5;
const PRICE_CHANGE_1H = 0.10;
const PRICE_CHANGE_24H = 0.20;

// Helper: Classify market into sector
function classifySector(title, description = '') {
  const text = (title + ' ' + description).toLowerCase();
  
  for (const [sector, keywords] of Object.entries(SECTORS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return sector;
      }
    }
  }
  return 'OTHER';
}

// Helper: Calculate standard deviation
function calculateStdDev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

// Helper: Calculate Z-score
function calculateZScore(value, mean, stdDev) {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

// Helper: Format currency
function formatCurrency(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

// Helper: Format time
function formatTime(date) {
  return date.toISOString().slice(11, 19);
}

// Helper: Check if we can alert for this market
function canAlert(marketId) {
  const lastAlert = lastAlertTime.get(marketId);
  if (!lastAlert) return true;
  return Date.now() - lastAlert > ALERT_COOLDOWN_MS;
}

// Helper: Record alert timestamp
function recordAlert(marketId) {
  lastAlertTime.set(marketId, Date.now());
}

// Helper: Update market history
function updateHistory(marketId, price, volume) {
  if (!marketHistory.has(marketId)) {
    marketHistory.set(marketId, []);
  }
  
  const history = marketHistory.get(marketId);
  const now = Date.now();
  
  // Add new sample
  history.push({ timestamp: now, price, volume });
  
  // Remove samples older than 7 days
  const cutoff = now - (HISTORY_DAYS * 24 * 60 * 60 * 1000);
  const filtered = history.filter(h => h.timestamp > cutoff);
  marketHistory.set(marketId, filtered);
  
  return filtered;
}

// Helper: Calculate anomaly score (0-100)
function calculateScore(volumeZ, priceChange1h, priceChange24h) {
  let score = 0;
  
  // Volume component (max 40 points)
  score += Math.min(40, Math.max(0, volumeZ * 10));
  
  // Price change 1h component (max 35 points)
  score += Math.min(35, (Math.abs(priceChange1h) / PRICE_CHANGE_1H) * 35);
  
  // Price change 24h component (max 25 points)
  score += Math.min(25, (Math.abs(priceChange24h) / PRICE_CHANGE_24H) * 25);
  
  return Math.min(100, Math.round(score));
}

// Fetch active markets from Gamma API
async function fetchMarkets() {
  try {
    const response = await fetch('https://gamma-api.polymarket.com/markets?active=true&closed=false&liquidityMin=10000&limit=200', {
      headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`[${formatTime(new Date())}] ❌ Failed to fetch markets:`, error.message);
    return [];
  }
}

// Process markets and detect anomalies
async function detectAnomalies() {
  const markets = await fetchMarkets();
  const now = new Date();
  
  for (const market of markets) {
    try {
      const marketId = market.id || market.conditionId;
      const title = market.question || market.title || 'Unknown';
      const description = market.description || '';
      const slug = market.slug || '';
      
      // Extract price
      let yesPrice = 0.5;
      if (market.outcomePrices) {
        const prices = JSON.parse(market.outcomePrices);
        yesPrice = parseFloat(prices[0]) || 0.5;
      } else if (market.yesPrice != null) {
        yesPrice = parseFloat(market.yesPrice);
      }
      
      // Extract volume and liquidity
      const volume = parseFloat(market.volume || market.volumeNum || 0);
      const liquidity = parseFloat(market.liquidity || market.liquidityNum || 0);
      
      // Skip low liquidity/volume markets
      if (liquidity < MIN_LIQUIDITY || volume < MIN_VOLUME) continue;
      
      // Classify sector
      const sector = classifySector(title, description);
      if (sector === 'OTHER') continue;
      
      // Update history
      const history = updateHistory(marketId, yesPrice, volume);
      
      // Need at least 3 samples for meaningful baseline
      if (history.length < 3) continue;
      
      // Calculate baseline stats
      const volumes = history.map(h => h.volume);
      const prices = history.map(h => h.price);
      
      const volumeMean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      const volumeStdDev = calculateStdDev(volumes);
      const volumeZ = calculateZScore(volume, volumeMean, volumeStdDev);
      
      const priceMean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const price1hAgo = history.find(h => h.timestamp > Date.now() - 3600000)?.price || priceMean;
      const price24hAgo = history[0]?.price || priceMean;
      
      const priceChange1h = (yesPrice - price1hAgo) / price1hAgo;
      const priceChange24h = (yesPrice - price24hAgo) / price24hAgo;
      
      // Check for anomalies
      const isVolumeAnomaly = volumeZ > VOLUME_Z_THRESHOLD;
      const isPriceAnomaly1h = Math.abs(priceChange1h) > PRICE_CHANGE_1H;
      const isPriceAnomaly24h = Math.abs(priceChange24h) > PRICE_CHANGE_24H;
      
      if ((isVolumeAnomaly || isPriceAnomaly1h || isPriceAnomaly24h) && canAlert(marketId)) {
        const score = calculateScore(volumeZ, priceChange1h, priceChange24h);
        
        // Build signals string
        const signals = [];
        if (isVolumeAnomaly) signals.push(`vol z: ${volumeZ.toFixed(1)}`);
        if (isPriceAnomaly1h) signals.push(`${priceChange1h > 0 ? '+' : ''}${(priceChange1h * 100).toFixed(0)}% (1h)`);
        if (isPriceAnomaly24h) signals.push(`${priceChange24h > 0 ? '+' : ''}${(priceChange24h * 100).toFixed(0)}% (24h)`);
        
        // Print alert
        console.log(`\n[${formatTime(now)}] 🔥 ${sector} (${score}/100)`);
        console.log(`Market: ${title.slice(0, 80)}${title.length > 80 ? '...' : ''}`);
        console.log(`Signals: ${signals.join(' | ')}`);
        console.log(`Price: $${yesPrice.toFixed(2)} | Volume: ${formatCurrency(volume)}`);
        console.log(`Link: https://polymarket.com/event/${slug}`);
        console.log('─'.repeat(60));
        
        recordAlert(marketId);
      }
      
    } catch (error) {
      // Skip malformed market data
      continue;
    }
  }
}

// Main loop
let isRunning = true;

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     POLYMARKET ANOMALY DETECTOR v1.0                     ║');
  console.log('║     Monitoring 7 sectors every 30 seconds...             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\nPress Ctrl+C to stop\n');
  
  while (isRunning) {
    try {
      await detectAnomalies();
    } catch (error) {
      console.error(`[${formatTime(new Date())}] ❌ Detection error:`, error.message);
    }
    
    // Wait 30 seconds before next scan
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  isRunning = false;
  process.exit(0);
});

process.on('SIGTERM', () => {
  isRunning = false;
  process.exit(0);
});

// Start
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
