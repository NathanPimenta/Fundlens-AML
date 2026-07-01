import { useState, useEffect, useCallback } from 'react';
import { fetchAlerts, fetchAlert } from '../api/client';
import type { AlertListItem, AlertDetail, AlertsResponse } from '../api/types';

export function useAlerts(status?: string) {
  const [alerts, setAlerts] = useState<AlertListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: AlertsResponse = await fetchAlerts({ status });
      setAlerts(data.alerts);
      setTotal(data.total);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.port === '5173' ? 'localhost:8000' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws/alerts`;
    
    let ws: WebSocket | null = null;
    let timer: any;
    
    function connect() {
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'new_alert') {
              setAlerts((prev) => {
                if (prev.some((a) => a.case_id === msg.data.case_id)) return prev;
                return [msg.data, ...prev];
              });
              setTotal((prev) => prev + 1);
            }
          } catch (e) {
            console.error('Error parsing WS message:', e);
          }
        };
        ws.onclose = () => {
          timer = setTimeout(connect, 3000);
        };
        ws.onerror = () => {
          ws?.close();
        };
      } catch (err) {
        console.error('WebSocket connection error:', err);
        timer = setTimeout(connect, 3000);
      }
    }
    
    connect();
    return () => {
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      clearTimeout(timer);
    };
  }, []);

  return { alerts, total, loading, error, refetch: load };
}

export function useAlertDetail(caseId: string | null) {
  const [detail, setDetail] = useState<AlertDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAlert(caseId);
      setDetail(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    setDetail(null);
    load();
  }, [load]);

  return { detail, loading, error, refetch: load };
}
