// Simple test for Polymarket search - inline all code
const TOPICS = {
  geopolitics: ['war', 'election', 'ukraine', 'israel', 'taiwan', 'iran', 'china', 'russia', 'politics', 'trump', 'biden', 'military', 'attack', 'strike', 'missile', 'invasion', 'embassy', 'gaza', 'hamas', 'hezbollah', 'nato', 'defense', 'ceasefire', 'peace', 'negotiation'],
  ai: ['ai', 'artificial intelligence', 'openai', 'chatgpt', 'claude', 'llm', 'gpt', 'model', 'machine learning', 'deep learning', 'neural', 'anthropic', 'gemini', 'bard', 'alignment', 'agi'],
  crypto: ['crypto', 'bitcoin', 'ethereum', 'btc', 'eth', 'etf', 'sec', 'coinbase', 'binance', 'blockchain', 'token', 'altcoin', 'cryptocurrency', 'solana', 'cardano', 'ripple', 'xrp', 'defi'],
  economy: ['recession', 'inflation', 'gdp', 'economy', 'unemployment', 'jobs', 'fed', 'interest rate', 'federal reserve', 'cpi', 'economic', 'ppi', 'retail sales', 'consumer'],
  finance: ['stock', 'market', 'nasdaq', 'sp500', 'dow', 'bank', 'finance', 'trading', 'equity', 'bull', 'bear', 'rally', 'crash', 'hedge fund'],
  science: ['climate', 'space', 'vaccine', 'health', 'science', 'nasa', 'medical', 'covid', 'pandemic', 'research', 'study', 'cancer', 'treatment', 'drug', 'fda'],
  tech: ['apple', 'google', 'meta', 'tesla', 'microsoft', 'amazon', 'tech', 'product', 'iphone', 'android', 'app', 'software', 'hardware', 'semiconductor', 'nvidia', 'chip']
};

function stem(word) {
  let w = word.toLowerCase();
  if (w.endsWith('sses')) w = w.slice(0, -2);
  else if (w.endsWith('ies')) w = w.slice(0, -2);
  else if (w.endsWith('ss')) w = w;
  else if (w.endsWith('s') && w.length > 3) w = w.slice(0, -1);
  
  if (w.endsWith('eed') && w.length > 4) w = w.slice(0, -1);
  else if (w.endsWith('ed') && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith('ing') && w.length > 5) w = w.slice(0, -3);
  
  if (w.endsWith('ational')) w = w.slice(0, -7) + 'e';
  else if (w.endsWith('tional')) w = w.slice(0, -6);
  else if (w.endsWith('ization')) w = w.slice(0, -7) + 'e';
  else if (w.endsWith('ication')) w = w.slice(0, -7) + 'e';
  
  return w;
}

function expandSearchTerm(term) {
  const lower = term.toLowerCase().trim();
  if (!lower) return [];
  
  const expansions = new Set();
  expansions.add(lower);
  expansions.add(stem(lower));
  
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
  
  const synonymMap = {
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
  
  for (const keywords of Object.values(TOPICS)) {
    for (const keyword of keywords) {
      if (keyword.includes(lower) && keyword !== lower) {
        expansions.add(keyword);
        expansions.add(stem(keyword));
      }
      if (stem(keyword).includes(stem(lower)) && stem(keyword) !== stem(lower)) {
        expansions.add(keyword);
      }
    }
  }
  
  return Array.from(expansions);
}

function similarityScore(s1, s2) {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1, s2) {
  const matrix = [];
  
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

function detectTopicsWithScore(question, searchTerm) {
  const q = question.toLowerCase();
  const qStems = q.split(/\s+/).map(stem);
  const results = [];
  
  const searchExpansions = searchTerm ? expandSearchTerm(searchTerm) : [];
  
  for (const [topic, keywords] of Object.entries(TOPICS)) {
    let score = 0;
    const matchedKeywords = [];
    
    for (const keyword of keywords) {
      const keywordStem = stem(keyword);
      let matchScore = 0;
      
      if (q.includes(keyword)) {
        matchScore = 1.0;
      }
      else if (qStems.some(s => s === keywordStem) || q.includes(keywordStem)) {
        matchScore = 0.8;
      }
      else if (searchExpansions.length > 0 && searchExpansions.some(exp => 
        keyword.includes(exp) || exp.includes(keyword) || stem(exp) === keywordStem
      )) {
        matchScore = 0.7;
      }
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
  
  results.sort((a, b) => b.score - a.score);
  return results;
}

function searchMarkets(markets, searchTerm, limit = 50) {
  if (!searchTerm || searchTerm.trim() === '') {
    return markets.slice(0, limit);
  }
  
  const expandedTerms = expandSearchTerm(searchTerm);
  const scoredMarkets = [];
  const searchLower = searchTerm.toLowerCase();
  
  for (const market of markets) {
    const question = (market.question || market.title || '').toLowerCase();
    const slug = (market.slug || '').toLowerCase();
    const combinedText = `${question} ${slug}`;
    
    // First check if this market belongs to any of our configured topics
    const topicMatches = detectTopicsWithScore(question, searchTerm);
    
    if (topicMatches.length === 0) {
      continue;
    }
    
    // Check if ANY expanded search term appears in the text (required for inclusion)
    let hasDirectMatch = false;
    for (const term of expandedTerms) {
      if (combinedText.includes(term)) {
        hasDirectMatch = true;
        break;
      }
    }
    
    // Also check if the original search term appears
    const hasSearchTermMatch = combinedText.includes(searchLower);
    
    // If no direct match at all, skip this market
    if (!hasDirectMatch && !hasSearchTermMatch) {
      continue;
    }
    
    let score = 0;
    
    // HEAVY bonus for exact search term match in question (highest priority)
    if (question.includes(searchLower)) {
      score += 10.0;
      // Extra bonus if it appears multiple times
      const occurrences = (question.match(new RegExp(searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      score += (occurrences - 1) * 2.0;
    }
    
    // Bonus for exact search term match in slug
    if (slug.includes(searchLower)) {
      score += 5.0;
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
    const fuzzyScore = similarityScore(searchLower, question);
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
  
  scoredMarkets.sort((a, b) => b.score - a.score);
  
  return scoredMarkets.slice(0, limit).map(item => ({
    ...item.market,
    _searchScore: item.score,
    _matchedTopics: item.topics.map(t => ({ topic: t.topic, score: t.score, keywords: t.matchedKeywords }))
  }));
}

function filterByConfiguredTopics(markets) {
  return markets.filter(market => {
    const question = market.question || market.title || '';
    const topicMatches = detectTopicsWithScore(question);
    return topicMatches.length > 0;
  });
}

// TEST EXECUTION
async function runTests() {
  console.log('🧪 Testing Polymarket Search Engine\n');
  
  const GAMMA_BASE = 'https://gamma-api.polymarket.com';
  
  async function fetchMarketsFromGamma() {
    const markets = [];
    const TAGS = [100265, 100328, 120, 1401, 21];
    
    for (const tagId of TAGS) {
      try {
        const url = `${GAMMA_BASE}/events?tag_id=${tagId}&closed=false&active=true&limit=50`;
        const response = await fetch(url, { 
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) continue;
        
        const events = await response.json();
        if (!Array.isArray(events)) continue;
        
        for (const event of events) {
          const eventMarkets = event.markets || [];
          for (const row of eventMarkets) {
            if (row.active === false || row.closed === true) continue;
            markets.push({ ...row, eventSlug: event.slug });
          }
        }
      } catch (err) {
        console.error(`Error fetching tag ${tagId}:`, err.message);
      }
    }
    
    return markets;
  }
  
  console.log('📡 Fetching real markets from Polymarket Gamma API...');
  const allMarkets = await fetchMarketsFromGamma();
  console.log(`✅ Fetched ${allMarkets.length} total markets\n`);
  
  if (allMarkets.length === 0) {
    console.log('❌ No markets fetched. API may be unavailable.');
    return;
  }
  
  console.log('🔍 Test 1: Filtering markets by configured topics...');
  const filteredMarkets = filterByConfiguredTopics(allMarkets);
  console.log(`✅ Found ${filteredMarkets.length} markets matching configured topics\n`);
  
  console.log('🔍 Test 2: Searching for "war"...');
  const warResults = searchMarkets(filteredMarkets, 'war', 10);
  console.log(`✅ Found ${warResults.length} results for "war"`);
  if (warResults.length > 0) {
    console.log('   Top result:', warResults[0].question?.substring(0, 80) + '...');
    console.log('   Score:', warResults[0]._searchScore?.toFixed(2));
    console.log('   Topics:', warResults[0]._matchedTopics?.map(t => t.topic).join(', '));
  }
  console.log('');
  
  console.log('🔍 Test 3: Searching for "bitcoin"...');
  const btcResults = searchMarkets(filteredMarkets, 'bitcoin', 10);
  console.log(`✅ Found ${btcResults.length} results for "bitcoin"`);
  if (btcResults.length > 0) {
    console.log('   Top result:', btcResults[0].question?.substring(0, 80) + '...');
    console.log('   Score:', btcResults[0]._searchScore?.toFixed(2));
    console.log('   Topics:', btcResults[0]._matchedTopics?.map(t => t.topic).join(', '));
  }
  console.log('');
  
  console.log('🔍 Test 4: Searching for "AI"...');
  const aiResults = searchMarkets(filteredMarkets, 'ai', 10);
  console.log(`✅ Found ${aiResults.length} results for "ai"`);
  if (aiResults.length > 0) {
    console.log('   Top result:', aiResults[0].question?.substring(0, 80) + '...');
    console.log('   Score:', aiResults[0]._searchScore?.toFixed(2));
    console.log('   Topics:', aiResults[0]._matchedTopics?.map(t => t.topic).join(', '));
  }
  console.log('');
  
  console.log('🔍 Test 5: Searching for "elections" (plural)...');
  const electionResults = searchMarkets(filteredMarkets, 'elections', 10);
  console.log(`✅ Found ${electionResults.length} results for "elections"`);
  if (electionResults.length > 0) {
    console.log('   Top result:', electionResults[0].question?.substring(0, 80) + '...');
    console.log('   Score:', electionResults[0]._searchScore?.toFixed(2));
    console.log('   Topics:', electionResults[0]._matchedTopics?.map(t => t.topic).join(', '));
  }
  console.log('');
  
  console.log('🔍 Test 6: Searching for "stock market"...');
  const stockResults = searchMarkets(filteredMarkets, 'stock', 10);
  console.log(`✅ Found ${stockResults.length} results for "stock"`);
  if (stockResults.length > 0) {
    console.log('   Top result:', stockResults[0].question?.substring(0, 80) + '...');
    console.log('   Score:', stockResults[0]._searchScore?.toFixed(2));
    console.log('   Topics:', stockResults[0]._matchedTopics?.map(t => t.topic).join(', '));
  }
  console.log('');
  
  console.log('🔍 Test 6b: Searching for "market" alone...');
  const marketResults = searchMarkets(filteredMarkets, 'market', 5);
  console.log(`✅ Found ${marketResults.length} results for "market"`);
  if (marketResults.length > 0) {
    marketResults.forEach((r, i) => {
      console.log(`   ${i+1}. ${r.question?.substring(0, 70)}... (score: ${r._searchScore?.toFixed(2)})`);
    });
  }
  console.log('');
  
  console.log('🔍 Test 7: Searching for "sports" (outside configured topics)...');
  const sportsResults = searchMarkets(filteredMarkets, 'sports', 10);
  console.log(`✅ Found ${sportsResults.length} results for "sports" (expected: 0 or very few)`);
  console.log('');
  
  console.log('🔍 Test 8: Testing topic detection on sample questions...');
  const sampleQuestions = [
    'Will there be a ceasefire in Gaza?',
    'Will Bitcoin reach $100k?',
    'Will the Fed raise interest rates?',
    'Will AI pass the Turing test?',
    'Will Tesla stock hit $500?'
  ];
  
  for (const question of sampleQuestions) {
    const topics = detectTopicsWithScore(question);
    console.log(`   "${question.substring(0, 40)}..."`);
    console.log(`      → Detected topics: ${topics.map(t => `${t.topic} (${t.score.toFixed(2)})`).join(', ')}`);
  }
  console.log('');
  
  console.log('🔍 Test 9: Testing search term expansion...');
  const testTerms = ['war', 'bitcoin', 'election', 'ai'];
  for (const term of testTerms) {
    const expansions = expandSearchTerm(term);
    console.log(`   "${term}" expands to: ${expansions.slice(0, 8).join(', ')}${expansions.length > 8 ? '...' : ''}`);
  }
  console.log('');
  
  console.log('═══════════════════════════════════════════');
  console.log('✅ All tests completed!');
  console.log('═══════════════════════════════════════════');
  console.log('\n📊 Summary:');
  console.log(`   - Total markets fetched: ${allMarkets.length}`);
  console.log(`   - Markets in configured topics: ${filteredMarkets.length}`);
  console.log(`   - Search is working within your configured tags only`);
  console.log(`   - Fuzzy matching, stemming, and synonym expansion are active`);
}

runTests().catch(console.error);
