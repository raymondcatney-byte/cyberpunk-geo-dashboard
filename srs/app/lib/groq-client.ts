export type GroqPersona = 'bruce' | 'makaveli';

export type GroqHistoryTurn = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type GroqCitation = {
  title: string;
  url: string;
  snippet?: string;
};

export type GroqToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

type GroqResponse = {
  ok?: boolean;
  content?: string;
  citations?: GroqCitation[];
  tool_calls?: GroqToolCall[];
  error?: string;
};

export async function callGroqPersona(params: {
  message: string;
  persona: GroqPersona;
  systemPrompt?: string;
  history?: GroqHistoryTurn[];
  context?: Record<string, unknown>;
  max_tokens?: number;
}) {
  const response = await fetch('/api/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: params.message,
      mode: params.persona,
      systemPrompt: params.systemPrompt,
      history: params.history || [],
      context: params.context,
      max_tokens: params.max_tokens,
    }),
  });

  const payload = (await response.json().catch(() => null)) as GroqResponse | null;
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || 'UPSTREAM');
  }

  return {
    content: payload.content || '',
    citations: Array.isArray(payload.citations) ? payload.citations : [],
    tool_calls: Array.isArray(payload.tool_calls) ? payload.tool_calls : [],
  };
}