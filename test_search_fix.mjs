// Test the updated search functionality with event titles
import { searchMarkets, filterByConfiguredTopics } from './api/polymarket/search.ts';

// Simulated market data with event titles (as returned by Gamma API)
const testMarkets = [
  {
    id: '1',
    question: 'Will Bitcoin hit $100k in 2025?',
    slug: 'bitcoin-100k-2025',
    eventTitle: 'Bitcoin price predictions',
    eventSlug: 'bitcoin-predictions-2025',
    active: true
  },
  {
    id: '2',
    question: 'Will Ethereum flip Bitcoin?',
    slug: 'eth-flip-btc',
    eventTitle: 'Ethereum vs Bitcoin market cap',
    eventSlug: 'eth-btc-marketcap',
    active: true
  },
  {
    id: '3',
    question: 'Will the Fed raise rates?',
    slug: 'fed-rate-hike',
    eventTitle: 'Federal Reserve interest rate decisions',
    eventSlug: 'fed-decisions-2025',
    active: true
  },
  {
    id: '4',
    question: 'Will Trump announce new policy?',
    slug: 'trump-policy',
    eventTitle: 'Trump administration policies',
    eventSlug: 'trump-policies-2025',
    active: true
  },
  {
    id: '5',
    question: 'Will AI replace developers?',
    slug: 'ai-replace-devs',
    eventTitle: 'Artificial Intelligence impact on jobs',
    eventSlug: 'ai-job-impact',
    active: true
  },
  {
    id: '6',
    question: 'Will there be a recession?',
    slug: 'recession-2025',
    eventTitle: 'Economic outlook and predictions',
    eventSlug: 'economy-2025',
    active: true
  }
];

console.log('Testing search with event titles...\n');

// Test 1: Search for "bitcoin" - should match markets 1 and 2
console.log('=== Test 1: Search "bitcoin" ===');
const bitcoinResults = searchMarkets(testMarkets, 'bitcoin', 10);
console.log(`Found ${bitcoinResults.length} results:`);
bitcoinResults.forEach(r => {
  console.log(`  - "${r.eventTitle}" -> "${r.question}" (score: ${r._searchScore?.toFixed(2)})`);
});

// Test 2: Search for "fed" - should match market 3
console.log('\n=== Test 2: Search "fed" ===');
const fedResults = searchMarkets(testMarkets, 'fed', 10);
console.log(`Found ${fedResults.length} results:`);
fedResults.forEach(r => {
  console.log(`  - "${r.eventTitle}" -> "${r.question}" (score: ${r._searchScore?.toFixed(2)})`);
});

// Test 3: Search for "ethereum" - should match market 2
console.log('\n=== Test 3: Search "ethereum" ===');
const ethResults = searchMarkets(testMarkets, 'ethereum', 10);
console.log(`Found ${ethResults.length} results:`);
ethResults.forEach(r => {
  console.log(`  - "${r.eventTitle}" -> "${r.question}" (score: ${r._searchScore?.toFixed(2)})`);
});

// Test 4: Search for "ai" - should match market 5
console.log('\n=== Test 4: Search "ai" ===');
const aiResults = searchMarkets(testMarkets, 'ai', 10);
console.log(`Found ${aiResults.length} results:`);
aiResults.forEach(r => {
  console.log(`  - "${r.eventTitle}" -> "${r.question}" (score: ${r._searchScore?.toFixed(2)})`);
});

// Test 5: Filter all markets by configured topics
console.log('\n=== Test 5: Filter all markets by topics ===');
const filtered = filterByConfiguredTopics(testMarkets);
console.log(`Found ${filtered.length} markets matching configured topics out of ${testMarkets.length}`);
filtered.forEach(r => {
  console.log(`  - "${r.eventTitle}" -> "${r.question}"`);
});

console.log('\n✅ All tests completed!');
