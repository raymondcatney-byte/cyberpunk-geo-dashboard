import { useState, useCallback } from 'react';
import { queryMakaveli, executeGlobeTool, type MakaveliResponse } from '../services/makaveliAgent';

interface UseMakaveliOptions {
  onToolCall?: (toolName: string, args: any) => void;
  onError?: (error: Error) => void;
}

interface MakaveliMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function useMakaveli(options: UseMakaveliOptions = {}) {
  const [messages, setMessages] = useState<MakaveliMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendQuery = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);

    // Add user message
    const userMessage: MakaveliMessage = {
      role: 'user',
      content: query,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Call Makaveli with function calling
      const response = await queryMakaveli(query, {
        recentEvents: [], // Could populate from news feed
        activeRegions: [] // Could populate from globe state
      });

      // Execute any tool calls
      if (response.tool_calls) {
        for (const toolCall of response.tool_calls) {
          await executeGlobeTool(toolCall);
          
          // Notify parent component
          if (options.onToolCall) {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              options.onToolCall(toolCall.function.name, args);
            } catch {
              options.onToolCall(toolCall.function.name, {});
            }
          }
        }
      }

      // Add assistant message
      const assistantMessage: MakaveliMessage = {
        role: 'assistant',
        content: response.content,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, assistantMessage]);

      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      if (options.onError) {
        options.onError(error);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendQuery,
    clearMessages
  };
}
