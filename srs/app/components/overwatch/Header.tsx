import { Search, RefreshCw, Radio, ExternalLink } from 'lucide-react';

interface HeaderProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  lastUpdated: Date | null;
  onRefresh: () => void;
  loading: boolean;
  dashboardUrl?: string;
}

const CATEGORIES = [
  { id: 'ALL', label: 'ALL' },
  { id: 'GEOPOLITICS', label: 'GEOPOLITICS' },
  { id: 'ECONOMY', label: 'ECONOMY' },
  { id: 'FINANCE', label: 'FINANCE' },
  { id: 'TECH', label: 'TECH' },
  { id: 'CRYPTO', label: 'CRYPTO' },
];

export function Header({
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  lastUpdated,
  onRefresh,
  loading,
  dashboardUrl,
}: HeaderProps) {
  return (
    <div className="h-[60px] border-b border-nerv-brown bg-nerv-void-panel flex items-center px-4 gap-4">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <Radio className="w-5 h-5 text-nerv-orange" />
        <span className="text-nerv-orange font-mono text-sm font-bold tracking-wider">
          INTELLIGENCE
        </span>
      </div>

      {/* Category Toggles */}
      <div className="flex items-center gap-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase border transition-colors ${
              selectedCategory === cat.id
                ? 'bg-nerv-orange-faint border-nerv-orange text-nerv-orange'
                : 'border-nerv-brown text-nerv-rust hover:border-nerv-orange hover:text-nerv-orange'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-[320px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nerv-rust" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search markets..."
          className="w-full pl-10 pr-3 py-2 bg-nerv-void border border-nerv-brown text-nerv-amber placeholder-nerv-rust text-sm font-mono focus:border-nerv-orange focus:outline-none"
        />
      </div>

      {/* Refresh */}
      <div className="flex items-center gap-2 shrink-0">
        {lastUpdated && (
          <span className="text-[10px] text-nerv-rust font-mono">
            {Math.floor((Date.now() - lastUpdated.getTime()) / 60000)}m ago
          </span>
        )}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 hover:bg-nerv-orange/10 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-nerv-orange ${loading ? 'animate-spin' : ''}`} />
        </button>
        
        {/* Dashboard Link */}
        {dashboardUrl && (
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-nerv-orange/20 border border-nerv-orange text-nerv-orange text-[10px] font-mono hover:bg-nerv-orange/30 transition-colors"
          >
            <span>OVERWATCH VIEWER</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
