export type WatchtowerFeed = {
  id: string;
  name: string;
  url: string;
  region: string;
  tags: string[];
};

// Curated allowlist for V1: open RSS/Atom feeds with geopolitical relevance.
// Keep this list small and high-signal. Add/remove sources based on operator preference.
export const WATCHTOWER_FEEDS: WatchtowerFeed[] = [
  {
    id: 'bbc-world',
    name: 'BBC News (World)',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    region: 'global',
    tags: ['news', 'reference', 'global'],
  },
  {
    id: 'aljazeera-all',
    name: 'Al Jazeera (All)',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    region: 'middle-east',
    tags: ['news', 'middle-east'],
  },
  {
    id: 'dw-all',
    name: 'DW (All)',
    url: 'https://rss.dw.com/rdf/rss-en-all',
    region: 'europe',
    tags: ['news', 'europe'],
  },
  {
    id: 'guardian-world',
    name: 'The Guardian (World)',
    url: 'https://www.theguardian.com/world/rss',
    region: 'global',
    tags: ['news', 'analysis', 'global'],
  },
  {
    id: 'cfr',
    name: 'Council on Foreign Relations (All)',
    url: 'https://www.cfr.org/rss.xml',
    region: 'global',
    tags: ['analysis', 'think-tank', 'us'],
  },
  {
    id: 'nato',
    name: 'NATO (News)',
    url: 'https://www.nato.int/cps/en/natohq/news_rss.htm',
    region: 'europe',
    tags: ['official', 'security', 'europe'],
  },
  {
    id: 'un-news',
    name: 'UN News (Global)',
    url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml',
    region: 'global',
    tags: ['official', 'global'],
  },
  {
    id: 'reuters-world',
    name: 'Reuters (World)',
    url: 'https://www.reutersagency.com/feed/?best-topics=world&post_type=best',
    region: 'global',
    tags: ['news', 'wire', 'global'],
  },
  {
    id: 'us-state',
    name: 'U.S. State Department (Press)',
    url: 'https://www.state.gov/rss-feed/press-releases/',
    region: 'us',
    tags: ['official', 'us'],
  },
  {
    id: 'federal-register',
    name: 'Federal Register (International Affairs)',
    url: 'https://www.federalregister.gov/documents/search.rss?conditions%5Btopics%5D%5B%5D=international-affairs',
    region: 'us',
    tags: ['official', 'sanctions', 'trade', 'us'],
  },
  {
    id: 'ofac',
    name: 'U.S. Treasury (OFAC)',
    url: 'https://home.treasury.gov/ofac/feed',
    region: 'us',
    tags: ['official', 'sanctions', 'us'],
  },
  {
    id: 'iea',
    name: 'IEA (News)',
    url: 'https://www.iea.org/rss/news.xml',
    region: 'global',
    tags: ['energy', 'official', 'global'],
  },
];
