import { useState, useRef, useEffect } from 'react';
import { Send, Crown, ExternalLink, Globe, Radio } from 'lucide-react';
import { Message } from '../config/persona';

interface ChatProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isTyping?: boolean;
}

export function Chat({ messages, onSendMessage, isTyping: externalIsTyping }: ChatProps) {
  const [input, setInput] = useState('');
  const isTyping = externalIsTyping || false;
  const nowLabel = new Date().toLocaleTimeString('en-US', { hour12: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const broadcastMonitorHref =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?view=broadcast-monitor`
      : '/?view=broadcast-monitor';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    onSendMessage(userMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e as any);
    }
  };

  return (
    <div className="h-full flex flex-col bg-nerv-void">
      {/* Header - NERV Style */}
      <div className="p-4 border-b border-nerv-brown flex items-center justify-between">
        <div>
          <h2 className="nerv-section-header" style={{ fontSize: '10px' }}>Command Channel</h2>
          <p className="nerv-body" style={{ fontSize: '10px', color: 'var(--steel-dim)' }}>Operator directive interface</p>
          <p className="nerv-tech-noise">
            MESSAGES: {messages.length} | TYPING: {isTyping ? 'YES' : 'NO'} | LOCAL: {nowLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse bg-nerv-orange" style={{ boxShadow: '0 0 6px #DB7828' }} />
          <span className="nerv-data text-nerv-orange" style={{ fontSize: '10px' }}>ONLINE</span>
        </div>
      </div>

      {/* Top toolbar - NERV Style */}
      <div className="px-4 py-2 border-b border-nerv-brown bg-nerv-void-panel">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="https://worldmonitor.app"
            target="_blank"
            rel="noopener noreferrer"
            className="nerv-button nerv-button-dim inline-flex items-center gap-2"
            style={{ fontSize: '10px', padding: '4px 8px' }}
          >
            <Globe className="w-3 h-3" />
            WORLD MONITOR
          </a>
          <a
            href={broadcastMonitorHref}
            target="_blank"
            rel="noopener noreferrer"
            className="nerv-button nerv-button-dim inline-flex items-center gap-2"
            style={{ fontSize: '10px', padding: '4px 8px' }}
          >
            <Radio className="w-3 h-3" />
            BROADCAST
          </a>
          <span className="ml-auto nerv-label text-nerv-rust" style={{ fontSize: '10px' }}>COMMS ARMED</span>
        </div>
      </div>

      {/* Messages - NERV Style */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-stretch justify-start p-2">
            <div className="nerv-panel border-nerv-brown">
              <div className="nerv-panel-content">
                <div className="nerv-label text-nerv-orange" style={{ marginBottom: '8px' }}>Awaiting Directive</div>
                <div className="nerv-body text-nerv-amber" style={{ fontSize: '12px' }}>
                  Enter a directive. For intel ingestion, use the Watchtower console.
                </div>
                <div className="nerv-timestamp text-nerv-rust" style={{ marginTop: '12px' }}>TIP: Shift+Enter for new line.</div>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`message-enter ${
                message.role === 'user' ? 'ml-auto max-w-[85%]' : 'mr-auto max-w-[85%]'
              }`}
            >
              <div className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {message.role === 'assistant' && (
                  <div 
                    className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-nerv-void-panel border border-nerv-brown"
                  >
                    <Crown className="w-4 h-4 text-nerv-orange" />
                  </div>
                )}
                <div className="p-4 nerv-panel border-nerv-brown" style={{ maxWidth: '100%' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="nerv-label"
                      style={{
                        color: message.role === 'user' ? '#DB7828' : '#E8A03C'
                      }}
                    >
                      {message.role === 'user' ? 'OPERATOR' : 'SYSTEM'}
                    </span>
                    <span className="nerv-timestamp text-nerv-rust">
                      {message.timestamp.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </span>
                  </div>
                  <p className="nerv-body text-nerv-amber" style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </p>

                  {message.role === 'assistant' && message.citations && message.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-nerv-brown">
                      <div className="nerv-label text-nerv-orange" style={{ marginBottom: '8px' }}>Sources</div>
                      <div className="space-y-1.5">
                        {message.citations.slice(0, 6).map((c) => (
                          <a
                            key={c.url}
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 nerv-body text-nerv-rust hover:text-nerv-orange transition-colors"
                            style={{ fontSize: '11px' }}
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate">{c.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {isTyping && (
          <div className="message-enter mr-auto max-w-[85%]">
            <div className="flex gap-3">
              <div 
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-nerv-void-panel border border-nerv-brown"
              >
                <Crown className="w-4 h-4 text-nerv-orange" />
              </div>
              <div className="p-4 nerv-panel border-nerv-brown">
                <div className="flex items-center gap-2 mb-2">
                  <span className="nerv-label text-nerv-amber">SYSTEM</span>
                  <span className="nerv-timestamp text-nerv-rust">...</span>
                </div>
                <div className="flex gap-1">
                  <div
                    className="w-2 h-2 rounded-full animate-bounce bg-nerv-orange"
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className="w-2 h-2 rounded-full animate-bounce bg-nerv-orange"
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className="w-2 h-2 rounded-full animate-bounce bg-nerv-orange"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input - NERV Style */}
      <div className="p-4 border-t border-nerv-brown">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ENTER DIRECTIVE..."
            rows={1}
            className="nerv-input w-full pr-12 resize-none border-nerv-brown focus:border-nerv-orange"
            style={{ minHeight: '48px', maxHeight: '120px', fontSize: '13px' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 nerv-button"
            style={{ padding: '6px' }}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="flex items-center justify-between mt-2">
          <span className="nerv-timestamp text-nerv-rust">Press Enter to send • Shift + Enter for new line</span>
          <span className="nerv-timestamp text-nerv-rust">{input.length}/500</span>
        </div>
      </div>
    </div>
  );
}
