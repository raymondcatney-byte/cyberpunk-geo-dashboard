/**
 * usePolymarketWebSocket Hook
 * Real-time price updates via WebSocket
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ClobPrice, PriceUpdateMessage, TradeMessage } from '../../types/polymarket';

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UsePolymarketWebSocketReturn {
  prices: Map<string, ClobPrice>;
  trades: TradeMessage['data'][];
  connected: boolean;
  connectionState: ConnectionState;
  subscribe: (conditionId: string) => void;
  unsubscribe: (conditionId: string) => void;
  error: string | null;
}

const WS_URL = 'wss://clob.polymarket.com/ws/market';
const RECONNECT_DELAY = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 10000; // 10 seconds

export function usePolymarketWebSocket(
  initialConditionIds: string[] = []
): UsePolymarketWebSocketReturn {
  const [prices, setPrices] = useState<Map<string, ClobPrice>>(new Map());
  const [trades, setTrades] = useState<TradeMessage['data'][]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set(initialConditionIds));
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setConnectionState('connecting');
    setError(null);

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected to CLOB');
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;

        // Resubscribe to all markets
        subscriptionsRef.current.forEach(conditionId => {
          ws.send(JSON.stringify({
            type: 'subscribe',
            conditionId
          }));
        });

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, HEARTBEAT_INTERVAL);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'price': {
              const priceData = message.data as PriceUpdateMessage['data'];
              const key = `${priceData.conditionId}_${priceData.outcome}`;
              
              setPrices(prev => {
                const next = new Map(prev);
                next.set(key, {
                  conditionId: priceData.conditionId,
                  assetId: priceData.assetId,
                  outcome: priceData.outcome,
                  price: priceData.price,
                  timestamp: priceData.timestamp
                });
                return next;
              });
              break;
            }

            case 'trade': {
              const tradeData = message.data as TradeMessage['data'];
              setTrades(prev => {
                // Keep last 100 trades
                const next = [...prev, tradeData];
                if (next.length > 100) {
                  next.shift();
                }
                return next;
              });
              break;
            }

            case 'subscription': {
              console.log('[WebSocket] Subscription update:', message.data);
              break;
            }

            case 'error': {
              console.error('[WebSocket] Error:', message.data);
              setError(message.data?.message || 'WebSocket error');
              break;
            }
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[WebSocket] Error:', err);
        setConnectionState('error');
        setError('WebSocket connection error');
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setConnectionState('disconnected');
        wsRef.current = null;

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Attempt reconnection
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1);
          
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError('Max reconnection attempts reached');
        }
      };
    } catch (err) {
      console.error('[WebSocket] Failed to connect:', err);
      setConnectionState('error');
      setError('Failed to establish WebSocket connection');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const subscribe = useCallback((conditionId: string) => {
    subscriptionsRef.current.add(conditionId);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        conditionId
      }));
    }
  }, []);

  const unsubscribe = useCallback((conditionId: string) => {
    subscriptionsRef.current.delete(conditionId);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        conditionId
      }));
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Subscribe to initial condition IDs when they change
  useEffect(() => {
    initialConditionIds.forEach(id => {
      if (!subscriptionsRef.current.has(id)) {
        subscribe(id);
      }
    });
  }, [initialConditionIds, subscribe]);

  return {
    prices,
    trades,
    connected: connectionState === 'connected',
    connectionState,
    subscribe,
    unsubscribe,
    error
  };
}

export default usePolymarketWebSocket;
