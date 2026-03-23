import { useState, useMemo, useRef } from 'react';
import {
  Search,
  TrendingUp,
  Globe,
  Target,
  Cpu,
  Map,
  FileText,
  ChevronRight,
  Bookmark,
  ExternalLink,
  Filter,
  Database,
  Clock,
  Loader2,
  Send,
  ExternalLinkIcon
} from 'lucide-react';
import { KNOWLEDGE_BASE, KNOWLEDGE_CATEGORIES, getKnowledgeByCategory, KnowledgeItem } from '../config/knowledgeBase';
import { generateResponse } from '../config/persona';
import { MAKAVELI_INTEL_PROMPT, WARROOM_INTEL_PROMPT } from '../config/prompts';
import { composeSystemPrompt } from '../config/responseStyle';

interface IntelBankProps {
  onSelectItem?: (item: KnowledgeItem) => void;
  /**
   * Optional system prompt used for the intelligence search.
   * Defaults to the provided system prompt (or a stored override).
   */
  systemPrompt?: string;
}
interface IntelCitation {
  title: string;
  url: string;
  snippet?: string;
}

async function runIntelDirectiveViaProxy(
  systemPrompt: string,
  userPrompt: string
): Promise<{ content: string; citations: IntelCitation[] }> {
  const response = await fetch('/api/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt,
      message: userPrompt,
      history: [],
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | {
        ok?: boolean;
        content?: unknown;
        citations?: unknown;
        error?: unknown;
      }
    | null;

  if (!response.ok || !data || data.ok !== true) {
    const err = data && typeof data.error === 'string' ? data.error : 'UPSTREAM';
    throw new Error(String(err));
  }

  const content = typeof data.content === 'string' ? data.content : '';
  const citationsRaw = Array.isArray(data.citations) ? data.citations : [];
  const citations: IntelCitation[] = citationsRaw
    .map((c) => (c && typeof c === 'object' ? (c as Record<string, unknown>) : null))
    .filter(Boolean)
    .map((c) => ({
      title: typeof c!.title === 'string' ? c!.title : 'Source',
      url: typeof c!.url === 'string' ? c!.url : '',
      snippet: typeof c!.snippet === 'string' ? c!.snippet : undefined,
    }))
    .filter((c) => Boolean(c.url));

  if (!content.trim()) {
    throw new Error('EMPTY_RESPONSE');
  }

  return { content, citations };
}
export function IntelBank({ onSelectItem, systemPrompt }: IntelBankProps) {
  // The text the user types into the intelligence box. Mirrors the
  // behavior of the chat directive input (textarea that submits on
  // Enter, Shift+Enter for newline).
  const [intelDirective, setIntelDirective] = useState('');
  // Filters Intel Bank cards only (does not affect AI directive input).
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [intelResponse, setIntelResponse] = useState('');
  const [intelCitations, setIntelCitations] = useState<IntelCitation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [intelError, setIntelError] = useState<string | null>(null);
  const [lastDirective, setLastDirective] = useState<string | null>(null);
  const [lastDirectiveAt, setLastDirectiveAt] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [bookmarkedItems, setBookmarkedItems] = useState<string[]>([]);

  const iconMap: Record<string, React.ElementType> = {
    TrendingUp: TrendingUp,
    Globe: Globe,
    Target: Target,
    Cpu: Cpu,
    Map: Map
  };

  const filteredItems = useMemo(() => {
    if (selectedCategory === null) return [];

    let items = selectedCategory === 'all' ? KNOWLEDGE_BASE : getKnowledgeByCategory(selectedCategory);
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      items = items.filter((item) => {
        const haystack = [item.title, item.summary, ...(item.tags || [])]
          .map((s) => String(s).toLowerCase())
          .join(' ');
        return haystack.includes(q);
      });
    }
    return items;
  }, [selectedCategory, searchQuery]);

  const toggleBookmark = (id: string) => {
    setBookmarkedItems(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const resolveIntelSystemPrompt = () => {
    // One shared persona: do not read localStorage overrides here.
    if (systemPrompt && systemPrompt.trim()) return systemPrompt;
    return WARROOM_INTEL_PROMPT;
  };

  const submitDirective = async () => {
    if (!intelDirective.trim() || isAnalyzing) return;

    const userQuery = intelDirective.trim();
    setIntelDirective('');
    setLastDirective(userQuery);
    setLastDirectiveAt(new Date());

    setIsAnalyzing(true);
    setIntelError(null);
    setIntelCitations([]);

    const contextualPrompt = selectedItem
      ? [
          'INTEL CONTEXT (selected item):',
          `Title: ${selectedItem.title}`,
          `Category: ${selectedItem.category}`,
          `Summary: ${selectedItem.summary}`,
          `Tags: ${selectedItem.tags.join(', ')}`,
          `Content: ${selectedItem.content}`,
          '',
          `Directive: ${userQuery}`,
        ].join('\n')
      : userQuery;

    try {
      const promptToUse = resolveIntelSystemPrompt();
      console.log('[SYSTEM] intel_directive', { mode: 'groq_compound_proxy' });

      const { content, citations } = await runIntelDirectiveViaProxy(composeSystemPrompt(promptToUse), contextualPrompt);
      setIntelResponse(content);
      setIntelCitations(citations);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Intel directive failed.';
      setIntelError(`DATA STREAM INTERRUPTED: ${message}`);
      setIntelResponse(`${generateResponse(contextualPrompt)}\n\n*[Note: API call failed. Using fallback mode.]*`);
      setIntelCitations([]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDirectiveSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void submitDirective();
  };

  return (
    <div className="h-full flex flex-col bg-nerv-void">
      {/* Header */}
      <div className="p-4 border-b border-nerv-brown">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 flex items-center justify-center border border-nerv-orange bg-nerv-orange/10">
            <Database className="w-5 h-5 text-nerv-orange" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-nerv-orange">Intel Bank</h2>
            <p className="text-[10px] text-nerv-rust">Strategic knowledge repository</p>
          </div>
        </div>

        {/* Search Intelligence (Comms-like directive input) */}
        <form onSubmit={handleDirectiveSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={intelDirective}
            onChange={(e) => setIntelDirective(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submitDirective();
              }
            }}
            placeholder="Search intelligence (Enter to execute)..."
            rows={1}
            className="w-full bg-nerv-void-panel border border-nerv-brown px-4 py-3 pr-12 text-[13px] text-nerv-amber placeholder-nerv-rust resize-none focus:border-nerv-orange/50 focus:ring-1 focus:ring-nerv-orange/50 transition-all"
            style={{ minHeight: '48px', maxHeight: '140px' }}
          />
          <button
            type="submit"
            disabled={!intelDirective.trim() || isAnalyzing}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-nerv-orange/20 text-nerv-orange hover:bg-nerv-orange/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Execute intelligence directive"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>

        {selectedItem && (
          <div className="mt-2 text-[10px] text-nerv-orange">
            Context linked: {selectedItem.title}
          </div>
        )}
        <div className="flex items-center justify-between mt-2 text-[10px] text-nerv-rust">
          <span>Press Enter to send • Shift + Enter for new line</span>
          <span>{intelDirective.length}/500</span>
        </div>
      </div>

      {/* Categories and content */}
      <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-nerv-brown">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-3 h-3 text-nerv-orange" />
              <span className="text-[10px] text-nerv-orange uppercase tracking-wider">Categories</span>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nerv-rust" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter Intel Bank cards..."
                className="w-full bg-nerv-void-panel border border-nerv-brown pl-10 pr-4 py-2 text-[13px] text-nerv-amber placeholder-nerv-rust focus:border-nerv-orange/50 transition-all"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 text-[11px] transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-nerv-orange/20 text-nerv-orange border border-nerv-orange/50'
                    : 'bg-nerv-void-panel text-nerv-rust border border-nerv-brown hover:border-nerv-orange/30'
                }`}
              >
                All
              </button>
              {KNOWLEDGE_CATEGORIES.map((category) => {
                const IconComponent = iconMap[category.icon] || FileText;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] transition-all ${
                      selectedCategory === category.id
                        ? 'bg-nerv-orange/20 text-nerv-orange border border-nerv-orange/50'
                        : 'bg-nerv-void-panel text-nerv-rust border border-nerv-brown hover:border-nerv-orange/30'
                    }`}
                  >
                    <IconComponent className="w-3 h-3" />
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {selectedCategory === null ? (
                <div className="py-8">
                  <div className="p-4 bg-nerv-void border border-nerv-brown">
                    <div className="text-[10px] uppercase tracking-widest text-nerv-orange">
                      Intel Bank
                    </div>
                    <p className="mt-2 text-[12px] text-nerv-amber leading-relaxed">
                      Select a category (or All) to load intel cards.
                    </p>
                  </div>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[12px] text-nerv-amber">No intelligence found</p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`p-3 border cursor-pointer transition-all ${
                      selectedItem?.id === item.id
                        ? 'bg-nerv-void-panel border-nerv-orange/50'
                        : 'bg-nerv-void-panel border-nerv-brown hover:border-nerv-orange/30'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 ${
                            item.category === 'investment'
                              ? 'bg-nerv-amber/20 text-nerv-amber'
                              : item.category === 'geopolitics'
                              ? 'bg-nerv-orange/20 text-nerv-orange'
                              : item.category === 'technology'
                              ? 'bg-nerv-orange/20 text-nerv-orange'
                              : item.category === 'strategy'
                              ? 'bg-nerv-rust/30 text-nerv-rust'
                              : 'bg-nerv-brown text-nerv-amber'
                          }`}
                        >
                          {item.category}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBookmark(item.id);
                          }}
                          aria-label="Toggle bookmark"
                          className="text-nerv-orange hover:text-nerv-amber transition-colors"
                        >
                          <Bookmark
                            className={`w-3 h-3 ${
                              bookmarkedItems.includes(item.id)
                                ? 'fill-nerv-orange text-nerv-orange'
                                : ''
                            }`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-nerv-rust">
                        <Clock className="w-3 h-3" />
                        {item.lastUpdated}
                      </div>
                    </div>
                    <h3 className="text-[13px] font-medium text-nerv-amber mb-1">{item.title}</h3>
                    <p className="text-[11px] text-nerv-rust line-clamp-2">{item.summary}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="text-[10px] text-nerv-rust">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Detail Panel */}
            {(selectedItem || intelResponse || intelError) && (
              <div className="w-full lg:w-[400px] border-t lg:border-t-0 lg:border-l border-nerv-brown overflow-y-auto p-4">
                {(intelResponse || intelError) && (
                  <div className="mb-4">
                    <div className="text-[10px] text-nerv-orange uppercase tracking-wider mb-2">Intel Directive Output</div>
                    <div className="p-3 bg-nerv-void-panel border border-nerv-brown">
                      {lastDirective && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-[10px] text-nerv-rust">
                            <span className="text-nerv-orange font-medium">OPERATOR</span>
                            <span className="font-mono">
                              {lastDirectiveAt
                                ? lastDirectiveAt.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false,
                                  })
                                : ''}
                            </span>
                          </div>
                          <p className="text-[12px] text-nerv-amber leading-relaxed whitespace-pre-wrap mt-1">
                            {lastDirective}
                          </p>
                        </div>
                      )}

                      {intelError ? (
                        <div className="text-[12px] text-nerv-alert">{intelError}</div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <div className="text-[10px] text-nerv-orange font-medium">MAKAVELI</div>
                            <p className="text-[12px] text-nerv-amber leading-relaxed whitespace-pre-wrap mt-1">
                              {intelResponse}
                            </p>
                          </div>
                          {intelCitations.length > 0 && (
                            <div>
                              <div className="text-[10px] text-nerv-orange uppercase tracking-wider mb-2">Live Sources</div>
                              <div className="space-y-1.5">
                                {intelCitations.map((citation, idx) => (
                                  <a
                                    key={`${citation.url}-${idx}`}
                                    href={citation.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-[11px] text-nerv-rust hover:text-nerv-orange transition-colors"
                                  >
                                    <ExternalLinkIcon className="w-3 h-3" />
                                    <span className="truncate">{citation.title}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedItem && (
                  <>
                    <div className="mb-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 ${
                          selectedItem.category === 'investment'
                            ? 'bg-nerv-amber/20 text-nerv-amber'
                            : selectedItem.category === 'geopolitics'
                              ? 'bg-nerv-orange/20 text-nerv-orange'
                              : selectedItem.category === 'technology'
                                ? 'bg-nerv-orange/20 text-nerv-orange'
                                : selectedItem.category === 'strategy'
                                  ? 'bg-nerv-rust/30 text-nerv-rust'
                                  : 'bg-nerv-brown text-nerv-amber'
                        }`}
                      >
                        {selectedItem.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium text-nerv-amber mb-2">{selectedItem.title}</h3>
                    <p className="text-[13px] text-nerv-rust mb-4">{selectedItem.summary}</p>
                  </>
                )}

                <div className="space-y-3">
                  {selectedItem ? (
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-nerv-orange" />
                          <span className="text-[12px] text-nerv-amber font-medium">Content</span>
                        </div>
                        <div className="p-3 bg-nerv-void-panel border border-nerv-brown">
                          <p className="text-[11px] text-nerv-rust whitespace-pre-line leading-relaxed">
                            {selectedItem.content}
                          </p>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <ExternalLink className="w-4 h-4 text-nerv-orange" />
                          <span className="text-[12px] text-nerv-amber font-medium">Tags</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selectedItem.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-2 py-1 bg-nerv-void-panel border border-nerv-brown text-nerv-rust"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {onSelectItem && (
                        <button
                          onClick={() => onSelectItem(selectedItem)}
                          className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-nerv-orange/20 text-nerv-orange border border-nerv-orange/30 hover:bg-nerv-orange/30 transition-all"
                        >
                          <Target className="w-4 h-4" />
                          <span className="text-[12px]">Use in Strategic Analysis</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="p-3 bg-nerv-void-panel border border-nerv-brown">
                      <p className="text-[12px] text-nerv-rust">Select an intel card to attach context.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}