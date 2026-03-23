// Polymarket Search API - Multi-API Aggregation (Gamma + Data + CLOB)
// Fetches from ALL 3 APIs simultaneously for maximum coverage

interface Market {
  id: string;
  question: string;
  description: string;
  slug: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  endDate: string;
  url: string;
}

interface MasterMarketsResponse {
  ok: boolean;
  masterMarkets: Record<string, Market[]>;
  counts: Record<string, number>;
  apiStats: {
    gamma: number;
    data: number;
    clob: number;
    unique: number;
  };
  timestamp: string;
  error?: string;
}

// UPDATED Tag IDs - Validated for clean data
const CATEGORY_TAGS: Record<string, number> = {
  // Standard Overwatch categories (matches OPPORTUNITY_TAGS)
  GEOPOLITICS: 100265,  // ✅ Clean
  ECONOMY: 100328,      // ✅ Economy
  FINANCE: 120,         // ✅ FINANCE tag (clean)
  TECH: 1401,           // ✅ Tech
  CRYPTO: 21,           // ✅ Crypto
  // Sub-categories (need keyword filtering)
  AI: 1401,             // ⚠️ TECH tag - needs keyword filter
  DeFi: 21,             // ⚠️ CRYPTO tag - needs keyword filter
  MACRO: 120,           // ✅ FINANCE tag (clean)
  ENERGY_COMMODITIES: 100328, // ⚠️ ECONOMY tag - needs keyword filter
  BIOTECH: 2            // ⚠️ POLITICS tag - needs keyword filter
};

// Keyword filters for broad tags (tag_id alone isn't precise enough)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  // AI: Filter TECH markets for AI-specific terms
  AI: ['ai', 'artificial intelligence', 'openai', 'chatgpt', 'gpt', 'llm', 'claude', 'anthropic', 'deepmind', 'gemini', 'machine learning', 'neural', 'alignment', 'agi'],
  
  // DeFi: Filter CRYPTO markets for DeFi-specific terms
  DeFi: ['defi', 'uniswap', 'yield', 'staking', 'lending', 'amm', 'liquidity', 'protocol', 'dex', 'vault', 'farm', 'pool', 'curve', 'aave', 'compound'],
  
  // ENERGY_COMMODITIES: Filter FINANCE markets for energy/commodity terms
  ENERGY_COMMODITIES: ['oil', 'gold', 'crude', '(cl)', '(gc)', 'natural gas', 'copper', 'silver', 'commodity', 'wti', 'brent', 'gasoline', 'heating oil', 'platinum', 'palladium'],
  
  // BIOTECH: Filter all markets for biotech terms (broad search)
  BIOTECH: ['biotech', 'fda', 'clinical trial', 'pharma', 'drug approval', 'therapeutics', 'vaccine', 'medical device', 'pdufa', 'nda', 'bla', 'phase 3', 'phase iii']
};

// Country keywords for nation filtering
const COUNTRY_KEYWORDS: Record<string, string[]> = {
  ISR: ['israel', 'gaza', 'palestine', 'hamas', 'netanyahu', 'idf', 'jerusalem'],
  UKR: ['ukraine', 'zelensky', 'kyiv', 'kiev'],
  RUS: ['russia', 'putin', 'moscow', 'kremlin'],
  CHN: ['china', 'xi', 'beijing', 'taiwan', 'tsmc'],
  IRN: ['iran', 'tehran', 'ayatollah'],
  TWN: ['taiwan', 'tsmc', 'strait']
};

// Opportunity detection tags (Geopolitics, Economy, Finance, Tech, Crypto)
const OPPORTUNITY_TAGS: Record<number, string> = {
  100265: 'GEOPOLITICS',
  100328: 'ECONOMY', 
  120: 'FINANCE',
  1401: 'TECH',
  21: 'CRYPTO'
};

// Sports blacklist for opportunities
const OPPORTUNITY_BLACKLIST = [
  'fifa', 'world cup', 'nba', 'nhl', 'nfl', 'mlb', 'stanley cup', 'finals',
  'uefa', 'champions league', 'grizzlies', 'senators', 'warriors', 'mavericks',
  'celtics', 'lakers', 'neymar', 'soccer', 'football'
];

type AnomalyType = 'volume_spike' | 'price_swing' | 'volume_accel' | 'liquidity' | 'smart_money';

interface Opportunity {
  market: Market;
  anomalies: AnomalyType[];
  compositeScore: number;
}

// Categories that need keyword filtering (not clean tags)
const NEEDS_KEYWORD_FILTER = ['AI', 'DeFi', 'ENERGY_COMMODITIES', 'BIOTECH'];

// Sports/Entertainment blacklist - STRICT REJECTION
const BLACKLIST_REGEX = /\b(NBA|NHL|MLB|FIFA|NFL|World Cup|Stanley Cup|Finals|Grizzlies|Senators|Warriors|UEFA|Champions League|UFC|GTA VI|Movie|Actor|Oscar|Grammy|Basketball|Baseball|Football|Soccer|Hockey|Tennis|Golf)\b/i;

function isSportsOrEntertainment(title: string): boolean {
  return BLACKLIST_REGEX.test(title);
}

function matchesCategoryKeywords(title: string, description: string, category: string): boolean {
  // Clean categories don't need keyword filtering
  if (!NEEDS_KEYWORD_FILTER.includes(category)) return true;
  
  const keywords = CATEGORY_KEYWORDS[category];
  if (!keywords || keywords.length === 0) return true;
  
  const text = (title + ' ' + description).toLowerCase();
  return keywords.some(kw => text.includes(kw.toLowerCase()));
}

function parseMarket(row: any, category: string): Market | null {
  try {
    const title = row.question || row.title || '';
    const description = row.description || '';
    if (!title) return null;

    // STRICT BLACKLIST CHECK
    if (isSportsOrEntertainment(title)) return null;
    
    // KEYWORD FILTER CHECK (for broad tags like TECH, CRYPTO, etc.)
    if (!matchesCategoryKeywords(title, description, category)) return null;

    let yesPrice = 0.5;
    let noPrice = 0.5;
    if (row.outcomePrices) {
      const prices = JSON.parse(row.outcomePrices);
      yesPrice = parseFloat(prices[0]) || 0.5;
      noPrice = parseFloat(prices[1]) || 0.5;
    } else if (row.yesPrice != null) {
      yesPrice = parseFloat(row.yesPrice);
      noPrice = parseFloat(row.noPrice) || (1 - yesPrice);
    }

    const liquidity = parseFloat(row.liquidity || row.liquidityNum || 0);
    const volume = parseFloat(row.volume || row.volumeNum || 0);

    // NO VOLUME FILTER - Include ALL markets regardless of liquidity
    return {
      id: row.id || row.conditionId || String(Date.now()),
      question: title.slice(0, 300),
      description: (row.description || '').slice(0, 500),
      slug: row.slug || '',
      category,
      yesPrice,
      noPrice,
      volume,
      liquidity,
      endDate: row.endDate || row.expirationDate || '',
      url: row.slug ? `https://polymarket.com/event/${row.slug}` : 'https://polymarket.com'
    };
  } catch {
    return null;
  }
}

// Opportunity detection helpers
function isOpportunitySports(title: string): boolean {
  // Use the comprehensive regex-based check
  return isSportsOrEntertainment(title);
}

function calcMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calcStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = calcMean(values);
  const variance = values.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calcZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

function detectOpportunities(markets: Market[]): Opportunity[] {
  if (markets.length === 0) return [];

  const volumes = markets.map(m => m.volume);
  const volumeMean = calcMean(volumes);
  const volumeStd = calcStdDev(volumes);

  return markets.map(market => {
    const anomalies: AnomalyType[] = [];

    // 1. Volume Spike: Z-score > 2
    const volumeZScore = calcZScore(market.volume, volumeMean, volumeStd);
    if (volumeZScore > 2) {
      anomalies.push('volume_spike');
    }

    // 2. Price Swing: > 10% change (using yesPrice as proxy)
    const priceChange = Math.abs(market.yesPrice - 0.5); // Simplified
    if (priceChange > 0.1) {
      anomalies.push('price_swing');
    }

    // 3. Volume Acceleration: Volume > 3x mean
    const volumeAccel = volumeMean > 0 ? market.volume / volumeMean : 0;
    if (volumeAccel > 3) {
      anomalies.push('volume_accel');
    }

    // 4. Liquidity Anomaly: Tight spread + high volume
    const spread = Math.abs(market.yesPrice - market.noPrice);
    const isTightSpread = spread < 0.02;
    const isHighVolume = market.volume > volumeMean;
    if (isTightSpread && isHighVolume) {
      anomalies.push('liquidity');
    }

    // 5. Smart Money: High volume + tight spread + price away from 50%
    const hasPriceMove = Math.abs(market.yesPrice - 0.5) > 0.05;
    if (isHighVolume && isTightSpread && hasPriceMove) {
      anomalies.push('smart_money');
    }

    // Calculate composite score
    let compositeScore = 0;
    compositeScore += Math.max(0, volumeZScore) * 1.5;
    compositeScore += priceChange * 100 * 0.2;
    compositeScore += Math.max(0, volumeAccel - 1) * 1.2;
    if (anomalies.includes('liquidity')) compositeScore += 15;
    if (anomalies.includes('smart_money')) compositeScore += 20;

    return {
      market,
      anomalies,
      compositeScore: Math.round(compositeScore)
    };
  });
}

// Fetch from Gamma API
async function fetchGamma(tagId: number, category: string): Promise<Market[]> {
  const markets: Market[] = [];
  const url = `https://gamma-api.polymarket.com/events?tag_id=${tagId}&closed=false&active=true&limit=100`;
  
  try {
    console.log(`[API] Fetching Gamma: ${url}`);
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    
    if (!response.ok) {
      console.error(`[API] Gamma failed for tag ${tagId}: ${response.status}`);
      return markets;
    }
    
    const events = await response.json();
    console.log(`[API] Gamma returned ${events.length} events for tag ${tagId}`);
    
    if (!Array.isArray(events)) {
      console.error(`[API] Gamma invalid response for tag ${tagId}: not an array`);
      return markets;
    }

    for (const event of events) {
      if (isSportsOrEntertainment(event.title || '')) continue;
      const eventMarkets = event.markets || [];
      for (const row of eventMarkets) {
        const market = parseMarket(row, category);
        if (market) markets.push(market);
      }
    }
    
    console.log(`[API] Gamma parsed ${markets.length} markets for ${category}`);
  } catch (err) {
    console.error(`[API] Gamma error for tag ${tagId}:`, err);
  }
  return markets;
}

// Fetch from Data API
async function fetchDataAPI(tagId: number, category: string): Promise<Market[]> {
  const markets: Market[] = [];
  const url = `https://data-api.polymarket.com/markets?tag_id=${tagId}&closed=false&active=true&limit=100`;
  
  try {
    console.log(`[API] Fetching Data API: ${url}`);
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    
    if (!response.ok) {
      console.error(`[API] Data API failed for tag ${tagId}: ${response.status}`);
      return markets;
    }
    
    const rows = await response.json();
    console.log(`[API] Data API returned ${rows.length} rows for tag ${tagId}`);
    
    if (!Array.isArray(rows)) {
      console.error(`[API] Data API invalid response for tag ${tagId}: not an array`);
      return markets;
    }

    for (const row of rows) {
      const market = parseMarket(row, category);
      if (market) markets.push(market);
    }
    
    console.log(`[API] Data API parsed ${markets.length} markets for ${category}`);
  } catch (err) {
    console.error(`[API] Data API error for tag ${tagId}:`, err);
  }
  return markets;
}

// Fetch from CLOB API
async function fetchCLOB(tagId: number, category: string): Promise<Market[]> {
  const markets: Market[] = [];
  try {
    const response = await fetch(
      `https://clob.polymarket.com/markets?tag_id=${tagId}&closed=false&active=true&limit=100`,
      { headers: { Accept: 'application/json' } }
    );
    if (!response.ok) return markets;
    
    const rows = await response.json();
    if (!Array.isArray(rows)) return markets;

    for (const row of rows) {
      const market = parseMarket(row, category);
      if (market) markets.push(market);
    }
  } catch {
    // Ignore errors
  }
  return markets;
}

// Special fetch for BIOTECH - searches across ALL tag IDs, filters by keywords only
async function fetchBiotechAcrossAllTags(): Promise<{ gamma: Market[], data: Market[], clob: Market[] }> {
  const allGamma: Market[] = [];
  const allData: Market[] = [];
  const allClob: Market[] = [];
  
  // Search across all clean tag IDs for biotech keywords
  const tagsToSearch = [100265, 1401, 21, 120, 100328, 2];
  
  for (const tagId of tagsToSearch) {
    const [gamma, data, clob] = await Promise.all([
      fetchGamma(tagId, 'BIOTECH'),
      fetchDataAPI(tagId, 'BIOTECH'),
      fetchCLOB(tagId, 'BIOTECH')
    ]);
    allGamma.push(...gamma);
    allData.push(...data);
    allClob.push(...clob);
  }
  
  return { gamma: allGamma, data: allData, clob: allClob };
}

// Merge markets from all 3 APIs, deduplicate by ID
function mergeMarkets(gamma: Market[], data: Market[], clob: Market[]): { markets: Market[], stats: { gamma: number, data: number, clob: number, unique: number } } {
  const marketMap = new Map<string, Market>();
  
  // Add gamma markets first
  for (const m of gamma) {
    marketMap.set(m.id, m);
  }
  
  // Add data markets (will overwrite if same ID)
  for (const m of data) {
    marketMap.set(m.id, m);
  }
  
  // Add clob markets
  for (const m of clob) {
    marketMap.set(m.id, m);
  }
  
  const markets = Array.from(marketMap.values());
  
  return {
    markets,
    stats: {
      gamma: gamma.length,
      data: data.length,
      clob: clob.length,
      unique: markets.length
    }
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  try {
    const { action = 'search' } = req.query;

    // Action: masterMarkets - Fetch ALL APIs, merge results
    if (action === 'masterMarkets') {
      const masterMarkets: Record<string, Market[]> = {};
      let totalGamma = 0;
      let totalData = 0;
      let totalClob = 0;
      let totalUnique = 0;
      
      // Fetch each category in parallel from ALL 3 APIs
      const fetchPromises = Object.entries(CATEGORY_TAGS).map(async ([category, tagId]) => {
        let gammaMarkets: Market[] = [];
        let dataMarkets: Market[] = [];
        let clobMarkets: Market[] = [];
        
        // BIOTECH: Search across ALL tag IDs with keyword filter
        if (category === 'BIOTECH') {
          const biotechResults = await fetchBiotechAcrossAllTags();
          gammaMarkets = biotechResults.gamma;
          dataMarkets = biotechResults.data;
          clobMarkets = biotechResults.clob;
        } else {
          // Standard category: Fetch from specific tag_id
          [gammaMarkets, dataMarkets, clobMarkets] = await Promise.all([
            fetchGamma(tagId, category),
            fetchDataAPI(tagId, category),
            fetchCLOB(tagId, category)
          ]);
        }
        
        // Merge and deduplicate
        const { markets, stats } = mergeMarkets(gammaMarkets, dataMarkets, clobMarkets);
        masterMarkets[category] = markets;
        
        totalGamma += stats.gamma;
        totalData += stats.data;
        totalClob += stats.clob;
        totalUnique += stats.unique;
      });

      await Promise.all(fetchPromises);

      // Calculate counts
      const counts: Record<string, number> = {};
      for (const [category, markets] of Object.entries(masterMarkets)) {
        counts[category] = markets.length;
      }

      const response: MasterMarketsResponse = {
        ok: true,
        masterMarkets,
        counts,
        apiStats: {
          gamma: totalGamma,
          data: totalData,
          clob: totalClob,
          unique: totalUnique
        },
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
      return;
    }

    // Action: countryMarkets - Filter markets by country keywords
    if (action === 'countryMarkets') {
      const country = String(req.query.country || '').toUpperCase();
      if (!country || !COUNTRY_KEYWORDS[country]) {
        res.status(400).json({ ok: false, error: 'INVALID_COUNTRY' });
        return;
      }
      
      const keywords = COUNTRY_KEYWORDS[country];
      const allMarkets: Market[] = [];
      
      // Fetch all markets then filter by country keywords
      for (const [category, tagId] of Object.entries(CATEGORY_TAGS)) {
        const [gamma, data, clob] = await Promise.all([
          fetchGamma(tagId, category),
          fetchDataAPI(tagId, category),
          fetchCLOB(tagId, category)
        ]);
        const { markets } = mergeMarkets(gamma, data, clob);
        allMarkets.push(...markets);
      }
      
      // Filter by country keywords
      const filtered = allMarkets.filter(m => {
        const text = (m.question + ' ' + m.description).toLowerCase();
        return keywords.some(kw => text.includes(kw));
      });
      
      res.status(200).json({
        ok: true,
        country,
        markets: filtered,
        count: filtered.length,
        keywords,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Legacy: allmarkets (flat array)
    if (action === 'allmarkets') {
      const allMarkets: Market[] = [];
      
      for (const [category, tagId] of Object.entries(CATEGORY_TAGS)) {
        const [gamma, data, clob] = await Promise.all([
          fetchGamma(tagId, category),
          fetchDataAPI(tagId, category),
          fetchCLOB(tagId, category)
        ]);
        const { markets } = mergeMarkets(gamma, data, clob);
        allMarkets.push(...markets);
      }

      res.status(200).json({
        ok: true,
        markets: allMarkets,
        count: allMarkets.length,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Legacy: events (geopolitics only)
    if (action === 'events') {
      const [gamma, data, clob] = await Promise.all([
        fetchGamma(100265, 'GEOPOLITICS'),
        fetchDataAPI(100265, 'GEOPOLITICS'),
        fetchCLOB(100265, 'GEOPOLITICS')
      ]);
      const { markets } = mergeMarkets(gamma, data, clob);
      
      res.status(200).json({
        ok: true,
        events: markets.map(m => ({
          id: m.id,
          title: m.question,
          description: m.description,
          markets: [m]
        })),
        count: markets.length,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Legacy: anomalies
    if (action === 'anomalies') {
      const allMarkets: Market[] = [];
      for (const [category, tagId] of Object.entries(CATEGORY_TAGS)) {
        const [gamma, data, clob] = await Promise.all([
          fetchGamma(tagId, category),
          fetchDataAPI(tagId, category),
          fetchCLOB(tagId, category)
        ]);
        const { markets } = mergeMarkets(gamma, data, clob);
        allMarkets.push(...markets);
      }

      // Calculate stats
      const priceHistory = allMarkets.map(m => m.yesPrice);
      const volHistory = allMarkets.map(m => m.volume);
      
      const avgPrice = priceHistory.length > 0 ? priceHistory.reduce((a, b) => a + b, 0) / priceHistory.length : 0.5;
      const avgVol = volHistory.length > 0 ? volHistory.reduce((a, b) => a + b, 0) / volHistory.length : 0;
      const priceStd = Math.sqrt(priceHistory.reduce((sq, n) => sq + Math.pow(n - avgPrice, 2), 0) / priceHistory.length || 1);
      const volStd = Math.sqrt(volHistory.reduce((sq, n) => sq + Math.pow(n - avgVol, 2), 0) / volHistory.length || 1);

      // Detect anomalies
      const anomalies: any[] = [];
      for (const m of allMarkets) {
        const priceZScore = Math.abs((m.yesPrice - avgPrice) / (priceStd || 1));
        const volZScore = Math.abs((m.volume - avgVol) / (volStd || 1));

        if (volZScore > 2.5 || priceZScore > 1.5) {
          let severity: 'critical' | 'high' | 'medium' = 'medium';
          if (volZScore > 4) severity = 'critical';
          else if (volZScore > 2.5) severity = 'high';

          anomalies.push({
            id: `anomaly-${m.id}`,
            title: m.question.slice(0, 80),
            description: `${m.category} market anomalous activity. Price: ${(m.yesPrice * 100).toFixed(1)}% YES.`,
            category: m.category,
            confidence: severity,
            price: m.yesPrice,
            volume: m.volume,
            liquidity: m.liquidity,
            timestamp: new Date().toISOString(),
            url: m.url,
            indicators: { volumeZScore: volZScore, priceZScore }
          });
        }
      }

      anomalies.sort((a, b) => {
        const sevMap = { critical: 3, high: 2, medium: 1 };
        if (sevMap[a.confidence] !== sevMap[b.confidence]) {
          return sevMap[b.confidence] - sevMap[a.confidence];
        }
        return b.volume - a.volume;
      });

      res.status(200).json({
        ok: true,
        anomalies: anomalies.slice(0, 20),
        count: anomalies.length,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Action: opportunities - New anomaly detection for V2
    if (action === 'opportunities') {
      console.log('[API] Opportunities action started');
      const allMarkets: Market[] = [];
      
      // Fetch from opportunity tags using /events endpoint (more reliable than /markets)
      for (const [tagId, categoryName] of Object.entries(OPPORTUNITY_TAGS)) {
        console.log(`[API] Fetching tag ${tagId} for ${categoryName}`);
        try {
          // Use /events endpoint which properly respects active/closed filters
          const response = await fetch(
            `https://gamma-api.polymarket.com/events?tag_id=${tagId}&active=true&closed=false&limit=50`,
            { headers: { Accept: 'application/json' } }
          );
          if (!response.ok) continue;
          
          const events = await response.json();
          if (!Array.isArray(events)) continue;
          
          // Extract markets from events
          for (const event of events) {
            if (isSportsOrEntertainment(event.title || '')) continue;
            
            const eventMarkets = event.markets || [];
            for (const row of eventMarkets) {
              // Skip inactive or closed markets
              if (row.active === false || row.closed === true) continue;
              
              const title = row.question || row.title || '';
              if (!title || isOpportunitySports(title)) continue;
              
              let yesPrice = 0.5;
              let noPrice = 0.5;
              if (row.outcomePrices) {
                try {
                  const prices = JSON.parse(row.outcomePrices);
                  yesPrice = parseFloat(prices[0]) || 0.5;
                  noPrice = parseFloat(prices[1]) || 0.5;
                } catch {
                  // Keep defaults
                }
              } else if (row.yesPrice != null) {
                yesPrice = parseFloat(row.yesPrice);
                noPrice = parseFloat(row.noPrice) || (1 - yesPrice);
              }

              allMarkets.push({
                id: row.id || row.conditionId || String(Date.now()),
                question: title.slice(0, 200),
                description: (row.description || '').slice(0, 300),
                slug: row.slug || event.slug || '',
                category: categoryName, // Use mapped category name
                yesPrice,
                noPrice,
                volume: parseFloat(row.volume || row.volumeNum || 0),
                liquidity: parseFloat(row.liquidity || row.liquidityNum || 0),
                endDate: row.endDate || row.expirationDate || event.endDate || '',
                url: row.slug 
                  ? `https://polymarket.com/market/${row.slug}` 
                  : event.slug 
                    ? `https://polymarket.com/event/${event.slug}` 
                    : 'https://polymarket.com'
              });
            }
          }
        } catch (err) {
          // Skip failed tags but log for debugging
          console.error(`Failed to fetch tag ${tagId}:`, err);
        }
      }
      
      // Also fetch from Data API for additional coverage
      for (const [tagId, categoryName] of Object.entries(OPPORTUNITY_TAGS)) {
        try {
          const response = await fetch(
            `https://data-api.polymarket.com/markets?tag_id=${tagId}&closed=false&active=true&limit=50`,
            { headers: { Accept: 'application/json' } }
          );
          if (!response.ok) continue;
          
          const rows = await response.json();
          if (!Array.isArray(rows)) continue;
          
          for (const row of rows) {
            // Skip inactive or closed markets
            if (row.active === false || row.closed === true) continue;
            
            const title = row.question || row.title || '';
            if (!title || isOpportunitySports(title)) continue;
            if (isSportsOrEntertainment(title)) continue;
            
            let yesPrice = 0.5;
            let noPrice = 0.5;
            if (row.outcomePrices) {
              try {
                const prices = JSON.parse(row.outcomePrices);
                yesPrice = parseFloat(prices[0]) || 0.5;
                noPrice = parseFloat(prices[1]) || 0.5;
              } catch {
                // Keep defaults
              }
            } else if (row.yesPrice != null) {
              yesPrice = parseFloat(row.yesPrice);
              noPrice = parseFloat(row.noPrice) || (1 - yesPrice);
            }

            allMarkets.push({
              id: row.id || row.conditionId || String(Date.now()),
              question: title.slice(0, 200),
              description: (row.description || '').slice(0, 300),
              slug: row.slug || '',
              category: categoryName,
              yesPrice,
              noPrice,
              volume: parseFloat(row.volume || row.volumeNum || 0),
              liquidity: parseFloat(row.liquidity || row.liquidityNum || 0),
              endDate: row.endDate || row.expirationDate || '',
              url: row.slug ? `https://polymarket.com/market/${row.slug}` : 'https://polymarket.com'
            });
          }
        } catch {
          // Skip failed data API calls
        }
      }

      // Deduplicate
      const marketMap = new Map<string, Market>();
      for (const m of allMarkets) {
        marketMap.set(m.id, m);
      }
      const uniqueMarkets = Array.from(marketMap.values());

      // Detect opportunities
      let opportunities = detectOpportunities(uniqueMarkets);
      opportunities.sort((a, b) => b.compositeScore - a.compositeScore);
      opportunities = opportunities.slice(0, 20);
      
      console.log(`[API] Returning ${opportunities.length} opportunities from ${uniqueMarkets.length} unique markets`);

      res.status(200).json({
        ok: true,
        opportunities,
        count: opportunities.length,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Default
    res.status(200).json({
      ok: true,
      message: 'Use action=masterMarkets for multi-API data',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      ok: false,
      masterMarkets: {},
      counts: {},
      apiStats: { gamma: 0, data: 0, clob: 0, unique: 0 },
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    });
  }
}
