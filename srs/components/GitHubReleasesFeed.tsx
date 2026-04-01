import { useEffect, useState, useRef } from 'react';
import { Tag, ExternalLink, Package, AlertCircle } from 'lucide-react';

interface Release {
  repo: string;
  owner: string;
  version: string;
  publishedAt: string;
  author: string;
  body: string;
  url: string;
  category: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Crypto: '#f59e0b',
  AI: '#a855f7',
  Commodities: '#06b6d4',
  Energy: '#10b981',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function GitHubReleasesFeed() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const isVisibleRef = useRef(true);

  const categories = ['All', 'Crypto', 'AI', 'Commodities', 'Energy'];

  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const fetchReleases = async () => {
      // Skip if tab not visible
      if (!isVisibleRef.current) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const res = await fetch('/api/intel-feeds?feed=github');
        if (!res.ok) throw new Error('Failed to fetch');
        
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'API error');
        
        setReleases(data.releases || []);
      } catch {
        setError('RATE_LIMITED');
      } finally {
        setLoading(false);
      }
    };

    fetchReleases();
    // Refresh every 10 minutes only when visible
    const interval = setInterval(() => {
      if (isVisibleRef.current) {
        fetchReleases();
      }
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredReleases = activeCategory === 'All' 
    ? releases 
    : releases.filter(r => r.category === activeCategory);

  return (
    <div className="nerv-panel border border-nerv-brown">
      <div className="nerv-panel-header bg-nerv-void-panel border-b border-nerv-brown">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-nerv-orange" />
          <span className="nerv-panel-title text-nerv-orange">Code Releases</span>
        </div>
        <span className="nerv-label">GITHUB</span>
      </div>
      
      {/* Category Filters */}
      <div className="px-3 py-2 border-b border-nerv-brown">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2 py-1 text-[10px] uppercase tracking-wider border transition-all ${
                activeCategory === cat
                  ? 'bg-nerv-orange/20 border-nerv-orange text-nerv-orange'
                  : 'bg-transparent border-nerv-brown text-nerv-rust hover:border-nerv-orange/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="nerv-panel-content">
        {loading ? (
          <div className="py-6 text-center">
            <div className="inline-block w-5 h-5 border-2 border-nerv-brown border-t-nerv-orange rounded-full animate-spin" />
            <p className="mt-2 text-[10px] text-nerv-rust">Fetching releases...</p>
          </div>
        ) : error === 'RATE_LIMITED' ? (
          <div className="py-6 text-center">
            <AlertCircle className="w-5 h-5 mx-auto text-nerv-alert" />
            <p className="mt-2 text-[11px] text-nerv-alert">GitHub rate limit reached</p>
            <p className="text-[10px] text-nerv-rust">Try again in a few minutes</p>
          </div>
        ) : filteredReleases.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-[11px] text-nerv-rust">No releases found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredReleases.map((release, idx) => (
              <a
                key={`${release.owner}-${release.repo}-${idx}`}
                href={release.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2.5 border border-nerv-brown bg-nerv-void-panel hover:border-nerv-orange transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ 
                          backgroundColor: `${CATEGORY_COLORS[release.category]}20`,
                          color: CATEGORY_COLORS[release.category],
                        }}
                      >
                        {release.category}
                      </span>
                      <span className="text-[11px] font-medium text-nerv-amber truncate">
                        {release.owner}/{release.repo}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1.5">
                      <Tag className="w-3 h-3 text-nerv-orange" />
                      <span className="text-[11px] text-nerv-orange font-mono">
                        {release.version}
                      </span>
                      <span className="text-[10px] text-nerv-rust">
                        {formatDate(release.publishedAt)}
                      </span>
                    </div>
                    
                    <p className="mt-1.5 text-[10px] text-nerv-rust line-clamp-2">
                      {release.body}
                    </p>
                    
                    <div className="flex items-center gap-1 mt-1.5 text-[9px] text-nerv-rust/70">
                      <span>by {release.author}</span>
                    </div>
                  </div>
                  
                  <ExternalLink className="w-3.5 h-3.5 text-nerv-rust opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
