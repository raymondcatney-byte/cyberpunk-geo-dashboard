'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, TrendingUp, RefreshCw } from 'lucide-react';
import { useEvents } from '../../hooks/useEvents';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function PMAnalystChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { displayedMarkets, loading: marketsLoading } = useEvents();
  
  // Filter markets by category
  const filteredMarkets = selectedCategory === 'all' 
    ? displayedMarkets 
    : displayedMarkets.filter(m => m.category?.toLowerCase() === selectedCategory);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      // Build context from Polymarket data
      const marketContext = filteredMarkets.slice(0, 5).map(m => ({
        question: m.question,
        yesPrice: Math.round(m.yesPrice * 100),
        volume: m.volume,
        category: m.category,
      }));
      
      const prompt = `You are a prediction market analyst. Analyze these Polymarket markets and answer the user's question.

Top Markets:
${marketContext.map(m => `- ${m.question}: ${m.yesPrice}% (Vol: $${(m.volume / 1e6).toFixed(1)}M)`).join('\n')}

User Question: ${userMessage.content}

Provide a concise analysis (2-3 sentences max). Focus on price levels, volume, and key insights.`;
      
      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          persona: 'bruce',
          systemPrompt: 'You are an expert prediction market analyst. Be concise and data-driven.',
        }),
      });
      
      if (!response.ok) throw new Error('API error');
      
      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || 'Analysis temporarily unavailable.',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error analyzing the markets. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  
  const categories = ['all', 'geopolitics', 'crypto', 'economy', 'finance', 'tech', 'science'];
  
  return (
    <div className="flex flex-col h-full bg-[var(--void)] border border-[var(--steel-faint)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--steel-faint)] bg-[var(--void-panel)]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[var(--nerv-orange-faint)] border border-[var(--nerv-orange-dim)]">
            <Sparkles className="h-4 w-4 text-[var(--nerv-orange)]" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-[var(--nerv-orange)]">PM Analyst</h3>
            <p className="text-[10px] uppercase tracking-wider text-[var(--steel-dim)]">
              Polymarket Intelligence
            </p>
          </div>
        </div>
        <div className="text-[10px] text-[var(--steel-dim)]">
          {filteredMarkets.length} markets
        </div>
      </div>
      
      {/* Category Filter */}
      <div className="flex gap-1 px-3 py-2 border-b border-[var(--steel-faint)] overflow-x-auto">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2 py-1 text-[10px] uppercase tracking-wider border transition-colors whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-[var(--nerv-orange-faint)] border-[var(--nerv-orange)] text-[var(--nerv-orange)]'
                : 'bg-transparent border-[var(--steel-faint)] text-[var(--steel-dim)] hover:border-[var(--nerv-orange-dim)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 text-[var(--steel-dim)]">
            <TrendingUp className="h-8 w-8 mx-auto mb-3 text-[var(--nerv-orange)] opacity-50" />
            <p className="text-[12px] mb-1">Ask about prediction markets</p>
            <p className="text-[10px] opacity-70">"Why is Trump at 62%?" or "What's the most traded market?"</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 text-[12px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[var(--nerv-orange-faint)] border border-[var(--nerv-orange-dim)] text-[var(--nerv-amber)] rounded-tl-lg rounded-br-lg'
                  : 'bg-[var(--void-panel)] border border-[var(--steel-faint)] text-[var(--steel)] rounded-tr-lg rounded-bl-lg'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--void-panel)] border border-[var(--steel-faint)] px-3 py-2 rounded-tr-lg rounded-bl-lg">
              <RefreshCw className="h-4 w-4 text-[var(--nerv-orange)] animate-spin" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="p-3 border-t border-[var(--steel-faint)] bg-[var(--void-panel)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about markets..."
            disabled={loading || marketsLoading}
            className="flex-1 bg-[var(--void)] border border-[var(--steel-faint)] px-3 py-2 text-[12px] text-[var(--steel)] placeholder-[var(--steel-dim)] focus:border-[var(--nerv-orange)] focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-3 py-2 bg-[var(--nerv-orange-faint)] border border-[var(--nerv-orange)] text-[var(--nerv-orange)] hover:bg-[var(--nerv-orange)] hover:text-[var(--void)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
