export const WATCHTOWER_FEEDS = [
  // Geopolitics / reference
  {
    id: 'bbc-world',
    name: 'BBC News (World)',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    region: 'global',
    tags: ['news', 'reference', 'geopolitics'],
  },
  {
    id: 'un-news',
    name: 'UN News (Global)',
    url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml',
    region: 'global',
    tags: ['official', 'geopolitics', 'humanitarian'],
  },
  {
    id: 'nato',
    name: 'NATO (News)',
    url: 'https://www.nato.int/cps/en/natohq/news_rss.htm',
    region: 'europe',
    tags: ['official', 'security', 'geopolitics', 'nato'],
  },
  {
    id: 'cfr',
    name: 'Council on Foreign Relations (All)',
    url: 'https://www.cfr.org/rss.xml',
    region: 'global',
    tags: ['analysis', 'think-tank', 'geopolitics'],
  },

  // Finance / sanctions / policy (official)
  {
    id: 'federal-register-intl',
    name: 'Federal Register (International Affairs)',
    url: 'https://www.federalregister.gov/documents/search.rss?conditions%5Btopics%5D%5B%5D=international-affairs',
    region: 'us',
    tags: ['official', 'sanctions', 'trade', 'geopolitics', 'finance'],
  },
  {
    id: 'ofac',
    name: 'U.S. Treasury (OFAC)',
    url: 'https://home.treasury.gov/ofac/feed',
    region: 'us',
    tags: ['official', 'sanctions', 'finance'],
  },
  {
    id: 'sec-press',
    name: 'SEC (Press Releases)',
    url: 'https://www.sec.gov/news/pressreleases.rss',
    region: 'us',
    tags: ['official', 'finance', 'markets', 'sec'],
  },
  {
    id: 'federal-reserve-press',
    name: 'Federal Reserve (Press Releases)',
    url: 'https://www.federalreserve.gov/feeds/press_all.xml',
    region: 'us',
    tags: ['official', 'finance', 'rates', 'macro'],
  },
  {
    id: 'bis-press',
    name: 'BIS (Press Releases)',
    url: 'https://www.bis.org/press/index.rss',
    region: 'global',
    tags: ['official', 'finance', 'macro', 'banking'],
  },
  {
    id: 'imf',
    name: 'IMF (News)',
    url: 'https://www.imf.org/en/News/RSS?language=eng',
    region: 'global',
    tags: ['official', 'finance', 'macro'],
  },
  {
    id: 'world-bank',
    name: 'World Bank (News)',
    url: 'https://www.worldbank.org/en/news/all?output=rss',
    region: 'global',
    tags: ['official', 'finance', 'development'],
  },

  // Biotech / health (official)
  {
    id: 'fda-recalls',
    name: 'FDA (Recalls, Market Withdrawals, Safety Alerts)',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/recalls/rss.xml',
    region: 'us',
    tags: ['official', 'biotech', 'health', 'fda'],
  },
  {
    id: 'fda-press',
    name: 'FDA (Press Announcements)',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-announcements/rss.xml',
    region: 'us',
    tags: ['official', 'biotech', 'health', 'fda'],
  },
  {
    id: 'medwatch',
    name: 'FDA MedWatch (Safety Information and Adverse Event Reporting)',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medwatch/rss.xml',
    region: 'us',
    tags: ['official', 'biotech', 'pharma', 'safety', 'fda'],
  },
  {
    id: 'nih-news',
    name: 'NIH (News Releases)',
    url: 'https://www.nih.gov/news-events/news-releases/rss.xml',
    region: 'us',
    tags: ['official', 'biotech', 'health', 'nih'],
  },

  // AI / agentic AI / robotics (primary)
  {
    id: 'arxiv-cs-ai',
    name: 'arXiv (cs.AI)',
    url: 'http://export.arxiv.org/rss/cs.AI',
    region: 'global',
    tags: ['arxiv', 'ai', 'primary', 'cs.ai'],
  },
  {
    id: 'arxiv-cs-lg',
    name: 'arXiv (cs.LG)',
    url: 'http://export.arxiv.org/rss/cs.LG',
    region: 'global',
    tags: ['arxiv', 'ai', 'primary', 'ml', 'cs.lg'],
  },
  {
    id: 'arxiv-cs-ma',
    name: 'arXiv (cs.MA)',
    url: 'http://export.arxiv.org/rss/cs.MA',
    region: 'global',
    tags: ['arxiv', 'agentic-ai', 'primary', 'multi-agent', 'cs.ma'],
  },
  {
    id: 'arxiv-cs-ro',
    name: 'arXiv (cs.RO)',
    url: 'http://export.arxiv.org/rss/cs.RO',
    region: 'global',
    tags: ['arxiv', 'robotics', 'primary', 'cs.ro'],
  },
  {
    id: 'arxiv-qbio-nc',
    name: 'arXiv (q-bio.NC)',
    url: 'http://export.arxiv.org/rss/q-bio.NC',
    region: 'global',
    tags: ['arxiv', 'biotech', 'primary', 'neural', 'q-bio.nc'],
  },

  // Crypto (minimal)
  {
    id: 'coindesk',
    name: 'CoinDesk (RSS)',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    region: 'global',
    tags: ['crypto', 'crypto-media', 'markets'],
  },
  {
    id: 'decrypt',
    name: 'Decrypt (RSS)',
    url: 'https://decrypt.co/feed',
    region: 'global',
    tags: ['crypto', 'crypto-media', 'markets'],
  },
];
