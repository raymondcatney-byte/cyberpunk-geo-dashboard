// Monitored markets configuration for NERV Dashboard
// Filtered to exclude gaming, sports, and legal markets

export interface MonitoredMarket {
  id: string;
  name: string;
  category: 'geopolitics' | 'crypto' | 'economy' | 'ai' | 'biotech' | 'tech' | 'other';
  threshold: number; // Price change % to trigger alert (0.05 = 5%)
  description?: string;
}

export const MONITORED_MARKETS: MonitoredMarket[] = [
  // Geopolitics
  {
    id: "putin-out-before-2027",
    name: "Putin Out Before 2027",
    category: "geopolitics",
    threshold: 0.03,
    description: "Will Putin leave office by December 31, 2026"
  },
  {
    id: "presidential-election-winner-2028",
    name: "2028 Presidential Election Winner",
    category: "geopolitics",
    threshold: 0.03,
    description: "Who will win the 2028 US Presidential Election"
  },
  {
    id: "which-party-wins-2028-us-presidential-election",
    name: "2028 Election Party Winner",
    category: "geopolitics",
    threshold: 0.03,
    description: "Which party wins 2028 US Presidential Election"
  },
  {
    id: "trump-wins-2028-presidential-election",
    name: "Trump Wins 2028",
    category: "geopolitics",
    threshold: 0.03,
    description: "Will Trump win the 2028 Presidential Election"
  },
  
  // Crypto
  {
    id: "what-price-will-bitcoin-hit-before-2027",
    name: "Bitcoin Price Before 2027",
    category: "crypto",
    threshold: 0.05,
    description: "What price will Bitcoin hit before 2027"
  },
  {
    id: "what-price-will-ethereum-hit-before-2027",
    name: "Ethereum Price Before 2027",
    category: "crypto",
    threshold: 0.05,
    description: "What price will Ethereum hit before 2027"
  },
  {
    id: "bitcoin-above-150k-july-2026",
    name: "BTC > $150K by July 2026",
    category: "crypto",
    threshold: 0.05,
    description: "Will Bitcoin exceed $150,000 by July 2026"
  },
  
  // Economy
  {
    id: "fed-rate-cut-march-2026",
    name: "Fed Rate Cut March 2026",
    category: "economy",
    threshold: 0.04,
    description: "Will the Fed cut rates in March 2026"
  },
  {
    id: "how-many-fed-rate-cuts-in-2026",
    name: "Fed Rate Cuts in 2026",
    category: "economy",
    threshold: 0.04,
    description: "How many Fed rate cuts in 2026"
  },
  {
    id: "us-recession-in-2026",
    name: "US Recession 2026",
    category: "economy",
    threshold: 0.05,
    description: "Will the US enter recession in 2026"
  },
  
  // AI
  {
    id: "agi-milestone-2026",
    name: "AGI Milestone 2026",
    category: "ai",
    threshold: 0.05,
    description: "Will AGI milestone be achieved in 2026"
  },
  {
    id: "ai-regulation-passed-2026",
    name: "AI Regulation 2026",
    category: "ai",
    threshold: 0.05,
    description: "Will major AI regulation pass in 2026"
  },
  
  // Biotech
  {
    id: "fda-drug-approval-2026",
    name: "FDA Drug Approval 2026",
    category: "biotech",
    threshold: 0.04,
    description: "Will major FDA drug approval happen in 2026"
  },
  
  // Tech
  {
    id: "sp-500-all-time-high-2026",
    name: "S&P 500 All-Time High 2026",
    category: "tech",
    threshold: 0.04,
    description: "Will S&P 500 hit all-time high in 2026"
  }
];

// localStorage key for price history
export const PRICE_HISTORY_KEY = 'nerv_polymarket_price_history';

// localStorage key for alerts
export const ALERTS_KEY = 'nerv_polymarket_alerts';

// Polling interval in milliseconds (15 minutes)
export const POLLING_INTERVAL = 15 * 60 * 1000;
