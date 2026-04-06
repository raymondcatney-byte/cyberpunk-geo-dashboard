import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";

import type { Message } from "../config/persona";

export function ProtocolsPromptBar({
  isTyping,
  lastUser,
  lastAssistant,
  onSubmit,
  onResponseSubmitted,
}: {
  isTyping: boolean;
  lastUser: Message | null;
  lastAssistant: Message | null;
  onSubmit: (text: string) => void;
  onResponseSubmitted?: () => void;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput("");
    onSubmit(text);
    onResponseSubmitted?.();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-b border-[#262626] bg-[#0a0a0a]">
      <div className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="nerv-panel-title text-nerv-amber">Protocols Prompt</div>
            <div className="nerv-label">Bruce Wayne strategic lens</div>
          </div>
          <div className="flex items-center gap-2 nerv-label">
            <span className="w-2 h-2 rounded-full bg-nerv-amber animate-pulse" />
            <span>WEB SEARCH</span>
          </div>
        </div>

        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="> Ask Bruce Wayne about a protocol..."
            rows={1}
            className="w-full bg-black border border-[#262626] rounded-none px-3 py-3 pr-12 text-[12px] text-white placeholder-[#666] focus:outline-none focus:border-[var(--data-green)] nerv-input"
            style={{ minHeight: 46, maxHeight: 140, resize: "none" }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={isTyping || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 border border-[#262626] text-[#a3a3a3] hover:text-white hover:border-[var(--data-green)] disabled:opacity-50 nerv-button"
            aria-label="Send"
            title="Send"
          >
            {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] text-[#525252]">
          <span>Enter to send. Shift+Enter for newline.</span>
          <span>{input.length}/1000</span>
        </div>


      </div>
    </div>
  );
}
