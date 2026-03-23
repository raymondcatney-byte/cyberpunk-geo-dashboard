// AI API Service
// Handles API calls to OpenAI, Anthropic, and Groq-compatible Grok provider key

export type AIProvider = 'openai' | 'anthropic' | 'grok';

export interface APIConfig {
  provider: AIProvider;
  apiKey: string;
}

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const GROK_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export async function generateAIResponse(
  message: string,
  systemPrompt: string,
  config: APIConfig,
  history: { role: string; content: string }[] = []
): Promise<string> {
  const { provider, apiKey } = config;

  try {
    switch (provider) {
      case 'openai':
        return await callOpenAI(message, systemPrompt, apiKey, history);
      case 'anthropic':
        return await callAnthropic(message, systemPrompt, apiKey, history);
      case 'grok':
        return await callGrok(message, systemPrompt, apiKey, history);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

async function callOpenAI(
  message: string,
  systemPrompt: string,
  apiKey: string,
  history: { role: string; content: string }[]
): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message }
  ];

  const response = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response generated';
}

async function callAnthropic(
  message: string,
  systemPrompt: string,
  apiKey: string,
  history: { role: string; content: string }[]
): Promise<string> {
  // Convert history to Anthropic format
  const anthropicMessages = history.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content
  }));

  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      system: systemPrompt,
      messages: [
        ...anthropicMessages,
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Anthropic API error');
  }

  const data = await response.json();
  return data.content[0]?.text || 'No response generated';
}

async function callGrok(
  message: string,
  systemPrompt: string,
  apiKey: string,
  history: { role: string; content: string }[]
): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message }
  ];

  const response = await fetch(GROK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages,
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Grok API error');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response generated';
}
