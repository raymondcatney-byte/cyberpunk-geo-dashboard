import { useEffect, useState, useCallback } from 'react';
import { Star, ExternalLink, GitBranch, AlertCircle } from 'lucide-react';

interface Repo {
  id: number;
  name: string;
  owner: string;
  description: string;
  stars: number;
  language: string;
  url: string;
  pushedAt: string;
}

interface GitHubResponse {
  ok: boolean;
  topic: string;
  repos: Repo[];
  count: number;
  error?: string;
  timestamp: number;
}

const TOPICS = [
  { key: 'all', label: 'All', color: '#e8a03c' },
  { key: 'crypto', label: 'Crypto', color: '#f59e0b' },
  { key: 'ai', label: 'AI', color: '#a855f7' },
  { key: 'energy', label: 'Energy', color: '#10b981' },
  { key: 'commodities', label: 'Commodities', color: '#06b6d4' },
  { key: 'economy', label: 'Economy', color: '#3b82f6' },
  { key: 'geopolitics', label: 'Geo', color: '#ef4444' },
];

const LANGUAGE_COLORS: Record<string, string> = {
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
  'Unknown': '#8b949e',
};

function formatStars(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export function GitHubCodeIntelCard() {
  const [activeTopic, setActiveTopic] = useState('all');
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/github/trending?topic=${activeTopic}&limit=10`);
      const data: GitHubResponse = await res.json();
      
      if (!data.ok) {
        throw new Error(data.error || 'Failed to fetch');
      }
      
      setRepos(data.repos);
      setLastUpdate(new Date(data.timestamp).toLocaleTimeString());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setRepos([]);
    } finally {
      setLoading(false);
    }
  }, [activeTopic]);

  useEffect(() => {
    fetchRepos();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchRepos, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRepos]);

  return (
    <div className="nerv-panel border border-[var(--steel-faint)]">
      {/* Header */}
      <div className="nerv-panel-header">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-[var(--wire-cyan)]" />
          <span className="nerv-panel-title">Code Intel</span>
        </div>
        <span className="nerv-label">GITHUB</span>
      </div>

      {/* Topic Filters */}
      <div className="px-3 py-2 border-b border-[var(--steel-faint)]">
        <div className="flex flex-wrap gap-1.5">
          {TOPICS.map((topic) => (
            <button
              key={topic.key}
              onClick={() => setActiveTopic(topic.key)}
              className={`px-2 py-1 text-[10px] uppercase tracking-wider border transition-all ${
                activeTopic === topic.key
                  ? 'bg-[var(--wire-cyan-faint)] border-[var(--wire-cyan)] text-[var(--wire-cyan)]'
                  : 'bg-transparent border-[var(--steel-faint)] text-[var(--steel-dim)] hover:border-[var(--wire-cyan-dim)]'
              }`}
              style={{
                color: activeTopic === topic.key ? topic.color : undefined,
                borderColor: activeTopic === topic.key ? topic.color : undefined,
                backgroundColor: activeTopic === topic.key ? `${topic.color}15` : undefined,
              }}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="nerv-panel-content">
        {loading ? (
          <div className="py-8 text-center">
            <div className="inline-block w-5 h-5 border-2 border-[var(--steel-faint)] border-t-[var(--wire-cyan)] rounded-full animate-spin" />
            <p className="mt-2 text-[10px] text-[var(--steel-dim)]">Loading repos...</p>
          </div>
        ) : error ? (
          <div className="py-6 text-center">
            <AlertCircle className="w-5 h-5 mx-auto text-[var(--alert-red)]" />
            <p className="mt-2 text-[11px] text-[var(--alert-red)]">
              {error === 'RATE_LIMITED' ? 'GitHub rate limit reached' : 'Failed to load'}
            </p>
            <button
              onClick={fetchRepos}
              className="mt-2 px-3 py-1 text-[10px] border border-[var(--steel-faint)] hover:border-[var(--wire-cyan)] transition-colors"
            >
              Retry
            </button>
          </div>
        ) : repos.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-[11px] text-[var(--steel-dim)]">No repositories found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {repos.map((repo) => (
              <a
                key={repo.id}
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2.5 border border-[var(--steel-faint)] bg-[var(--void-panel)] hover:border-[var(--wire-cyan)] transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-[var(--steel)] truncate">
                        {repo.owner}/{repo.name}
                      </span>
                      <ExternalLink className="w-3 h-3 text-[var(--steel-dim)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="mt-1 text-[10px] text-[var(--steel-dim)] line-clamp-2">
                      {repo.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 mt-2">
                  {/* Stars */}
                  <div className="flex items-center gap-1 text-[10px] text-[var(--nerv-orange)]">
                    <Star className="w-3 h-3" />
                    <span>{formatStars(repo.stars)}</span>
                  </div>
                  
                  {/* Language */}
                  {repo.language && (
                    <div className="flex items-center gap-1 text-[10px]">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: LANGUAGE_COLORS[repo.language] || LANGUAGE_COLORS.Unknown,
                        }}
                      />
                      <span className="text-[var(--steel-dim)]">{repo.language}</span>
                    </div>
                  )}
                  
                  {/* Last pushed */}
                  <span className="text-[10px] text-[var(--steel-dim)] ml-auto">
                    {formatTimeAgo(repo.pushedAt)}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
        
        {/* Footer */}
        <div className="mt-3 pt-2 border-t border-[var(--steel-faint)] flex justify-between items-center">
          <span className="text-[9px] text-[var(--steel-dim)] uppercase tracking-wider">
            {repos.length} repos
          </span>
          {lastUpdate && (
            <span className="text-[9px] text-[var(--steel-dim)]">
              {lastUpdate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
