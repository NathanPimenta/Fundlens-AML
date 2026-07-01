import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface LiveTransactionEvent {
  transaction_id: string;
  sender: string;
  receiver: string;
  amount: number;
  channel: string;
  risk_score: number;
  status: 'APPROVED' | 'DECLINED' | 'PENDING_VERIFICATION';
  created_at: string;
  case_id?: string;
}

export interface LiveStreamState {
  isStreaming: boolean;
  latestTransaction: LiveTransactionEvent | null;
  transactions: LiveTransactionEvent[];
  latestRiskScore: number | null;
  startStream: () => void;
  stopStream: () => void;
}

function buildStreamUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.port === '5173' ? 'localhost:8000' : window.location.host;
  return `${protocol}//${host}/api/transactions/stream`;
}

export function useLiveSimulator(): LiveStreamState {
  const wsRef = useRef<WebSocket | null>(null);
  const shouldReconnectRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [latestTransaction, setLatestTransaction] = useState<LiveTransactionEvent | null>(null);
  const [transactions, setTransactions] = useState<LiveTransactionEvent[]>([]);

  const stopStream = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    shouldReconnectRef.current = true;
    const connect = () => {
      try {
        const ws = new WebSocket(buildStreamUrl());
        wsRef.current = ws;

        ws.onopen = () => {
          setIsStreaming(true);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data) as { type?: string; data?: LiveTransactionEvent };
            if (msg.type !== 'transaction_stream' || !msg.data) {
              return;
            }

            setLatestTransaction(msg.data);
            setTransactions((prev) => [msg.data, ...prev].slice(0, 10));
          } catch (error) {
            console.error('Error parsing live simulator event:', error);
          }
        };

        ws.onclose = () => {
          setIsStreaming(false);
          wsRef.current = null;
          if (shouldReconnectRef.current) {
            reconnectTimerRef.current = window.setTimeout(connect, 2000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (error) {
        console.error('Failed to connect live simulator stream:', error);
        setIsStreaming(false);
        if (shouldReconnectRef.current) {
          reconnectTimerRef.current = window.setTimeout(connect, 2000);
        }
      }
    };

    connect();
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const latestRiskScore = useMemo(() => {
    return latestTransaction ? latestTransaction.risk_score : null;
  }, [latestTransaction]);

  return {
    isStreaming,
    latestTransaction,
    transactions,
    latestRiskScore,
    startStream,
    stopStream,
  };
}
