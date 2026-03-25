// GitHub Trending API - Fetches trending repositories by topic
// GET /api/github/trending?topic=crypto&limit=10

const GITHUB_API_BASE = 'https://api.github.com';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  pushed_at: string;
  topics: string[];
}

interface TrendingRepo {
  id: number;
  name: string;
  owner: string;
  description: string;
  stars: number;
  language: string;
  url: string;
  pushedAt: string;
}

// Topic mapping to GitHub search queries
const TOPIC_QUERIES: Record<string, string> = {
  crypto: 'topic:crypto stars:>100 pushed:>2024-01-01',
  ai: 'topic:artificial-intelligence stars:>100 pushed:>2024-01-01',
  energy: 'topic:energy stars:>50 pushed:>2024-01-01',
  commodities: 'topic:commodities stars:>10 pushed:>2024-01-01',
  economy: 'topic:economy stars:>50 pushed:>2024-01-01',
  geopolitics: 'topic:geopolitics stars:>10 pushed:>2024-01-01',
};

// Language colors for UI
export const LANGUAGE_COLORS: Record<string, string> = {
  'TypeScript': '#3178c6',
  'JavaScript': '#f1e05a',
  'Python': '#3572A5',
  'Rust': '#dea584',
  'Go': '#00ADD8',
  'Solidity': '#AA6746',
  'Java': '#b07219',
  'C++': '#f34b7d',
  'C': '#555555',
  'Ruby': '#701516',
  'Swift': '#ffac45',
  'Kotlin': '#A97BFF',
  default: '#8b949e',
};

async function fetchTrendingRepos(query: string, limit: number): Promise<TrendingRepo[]> {
  const url = `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${limit}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Cyberpunk-Dashboard-GitHub-Intel',
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('RATE_LIMITED');
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();
  const repos: GitHubRepo[] = data.items || [];

  return repos.map((repo) => ({
    id: repo.id,
    name: repo.name,
    owner: repo.full_name.split('/')[0],
    description: repo.description?.slice(0, 120) || 'No description',
    stars: repo.stargazers_count,
    language: repo.language || 'Unknown',
    url: repo.html_url,
    pushedAt: repo.pushed_at,
  }));
}

export default async function handler(req: any, res: any) {
  // Set CORS and cache headers
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const url = new URL(req.url, 'http://localhost');
    const topic = url.searchParams.get('topic') || 'all';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 20);

    let repos: TrendingRepo[] = [];
    let errors: string[] = [];

    if (topic === 'all') {
      // Fetch from multiple topics in parallel
      const topics = ['crypto', 'ai', 'energy', 'commodities', 'economy', 'geopolitics'];
      const results = await Promise.allSettled(
        topics.map(async (t) => {
          const query = TOPIC_QUERIES[t];
          return fetchTrendingRepos(query, Math.ceil(limit / 2));
        })
      );

      const allRepos: TrendingRepo[] = [];
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          allRepos.push(...result.value);
        } else {
          errors.push(`${topics[idx]}: ${result.reason?.message || 'failed'}`);
        }
      });

      // Sort by stars and deduplicate
      const seen = new Set<number>();
      repos = allRepos
        .sort((a, b) => b.stars - a.stars)
        .filter((repo) => {
          if (seen.has(repo.id)) return false;
          seen.add(repo.id);
          return true;
        })
        .slice(0, limit);
    } else {
      // Fetch specific topic
      const query = TOPIC_QUERIES[topic];
      if (!query) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid topic' }));
        return;
      }
      repos = await fetchTrendingRepos(query, limit);
    }

    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      topic,
      repos,
      count: repos.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: Date.now(),
    }));

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isRateLimit = message === 'RATE_LIMITED';
    
    res.statusCode = isRateLimit ? 429 : 500;
    res.end(JSON.stringify({
      ok: false,
      error: message,
      repos: [],
      count: 0,
      timestamp: Date.now(),
    }));
  }
}
