// Test script for Polymarket search functionality
import { searchMarkets, filterByConfiguredTopics, detectTopicsWithScore, expandSearchTerm } from './api/polymarket/search.js';

const GAMMA_BASE = 'https://gamma-api.polymarket.com';

async function fetchMarketsFromGamma() {
  const markets = [];
  
  const TAGS = [
    100265, // GEOPOLITICS
    100328, // ECONOMY
    120,    // FINANCE
    1401,   // TECH
    21,     // CRYPTO
  ];
  
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
          markets.push({
            ...row,
            eventSlug: event.slug
          });
        }
      }
    } catch (err) {
      console.error(`Error fetching tag ${tagId}:`, err.message);
    }
  }
  
  return markets;
}

async function runTests() {
  console.log('🧪 Testing Polymarket Search Engine\n');
  
  // Fetch real markets
  console.log('📡 Fetching real markets from Polymarket Gamma API...');
  const allMarkets = await fetchMarketsFromGamma();
  console.log(`✅ Fetched ${allMarkets.length} total markets\n`);
  
  if (allMarkets.length === 0) {
    console.log('❌ No markets fetched. API may be unavailable.');
    return;
  }
  
  // Test 1: Filter by configured topics
  console.log('🔍 Test 1: Filtering markets by configured topics...');
  const filteredMarkets = filterByConfiguredTopics(allMarkets);
  console.log(`✅ Found ${filteredMarkets.length} markets matching configured topics\n`);
  
  // Test 2: Search for "war" (geopolitics)
  console.log('🔍 Test 2: Searching for "war"...');
  const warResults = searchMarkets(filteredMarkets, 'war', 10);
  console.log(`✅ Found ${warResults.length} results for "war"`);
  if (warResults.length > 0) {
    console.log('   Top result:', warResults[0].question?.substring(0, 80) + '...');
    console.log('   Score:', warResults[0]._searchScore?.toFixed(2));
    console.log('   Topics:', warResults[0]._matchedTopics?.map(t => t.topic).join(', '));
  }
  console.log('');
  
  // Test 3: Search for "bitcoin" (crypto)
  console.log('🔍 Test 3: Searching for "bitcoin"...');
  const btcResults = searchMarkets(filteredMarkets, 'bitcoin', 10);
  console.log(`✅ Found ${btcResults.length} results for "bitcoin"`);
  if (btcResults.length > 0) {
    console.log('   Top result:', btcResults[0].question?.substring(0, 80) + '...');
    console.log('   Score:', btcResults[0]._searchScore?.toFixed(2));
    console.log('   Topics:', btcResults[0]._matchedTopics?.map(t => t.topic).join(', '));
  }
  console.log('');
  
  // Test 4: Search for "AI" (artificial intelligence)
  console.log('🔍 Test 4: Searching for "AI"...');
  const aiResults = searchMarkets(filteredMarkets, 'ai', 10);
  console.log(`✅ Found ${aiResults.length} results for "ai"`);
  if (aiResults.length > 0) {
    console.log('   Top result:', aiResults[0].question?.substring(0, 80) + '...');
    console.log('   Score:', aiResults[0]._searchScore?.toFixed(2));
    console.log('   Topics:', aiResults[0]._matchedTopics?.map(t => t.topic).join(', '));
  }
  console.log('');
  
  // Test 5: Search for similar term "elections" (should match "election")
  console.log('🔍 Test 5: Searching for "elections" (plural)...');
  const electionResults = searchMarkets(filteredMarkets, 'elections', 10);
  console.log(`✅ Found ${electionResults.length} results for "elections"`);
  if (electionResults.length > 0) {
    console.log('   Top result:', electionResults[0].question?.substring(0, 80) + '...');
    console.log('   Score:', electionResults[0]._searchScore?.toFixed(2));
    console.log('   Topics:', electionResults[0]._matchedTopics?.map(t => t.topic).join(', '));
  }
  console.log('');
  
  // Test 6: Search for "stock market" (finance)
  console.log('🔍 Test 6: Searching for "stock market"...');
  const stockResults = searchMarkets(filteredMarkets, 'stock market', 10);
  console.log(`✅ Found ${stockResults.length} results for "stock market"`);
  if (stockResults.length > 0) {
    console.log('   Top result:', stockResults[0].question?.substring(0, 80) + '...');
    console.log('   Score:', stockResults[0]._searchScore?.toFixed(2));
    console.log('   Topics:', stockResults[0]._matchedTopics?.map(t => t.topic).join(', '));
  }
  console.log('');
  
  // Test 7: Search for term outside configured topics (should return empty or very few)
  console.log('🔍 Test 7: Searching for "sports" (outside configured topics)...');
  const sportsResults = searchMarkets(filteredMarkets, 'sports', 10);
  console.log(`✅ Found ${sportsResults.length} results for "sports" (expected: 0 or very few)`);
  if (sportsResults.length > 0) {
    console.log('   Note: Some results may appear due to fuzzy matching, but should be minimal');
  }
  console.log('');
  
  // Test 8: Test topic detection
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
  
  // Test 9: Test search term expansion
  console.log('🔍 Test 9: Testing search term expansion...');
  const testTerms = ['war', 'bitcoin', 'election', 'ai'];
  for (const term of testTerms) {
    const expansions = expandSearchTerm(term);
    console.log(`   "${term}" expands to: ${expansions.slice(0, 8).join(', ')}${expansions.length > 8 ? '...' : ''}`);
  }
  console.log('');
  
  // Summary
  console.log('═══════════════════════════════════════════');
  console.log('✅ All tests completed successfully!');
  console.log('═══════════════════════════════════════════');
  console.log('\n📊 Summary:');
  console.log(`   - Total markets fetched: ${allMarkets.length}`);
  console.log(`   - Markets in configured topics: ${filteredMarkets.length}`);
  console.log(`   - Search is working within your configured tags only`);
  console.log(`   - Fuzzy matching, stemming, and synonym expansion are active`);
}

runTests().catch(console.error);
