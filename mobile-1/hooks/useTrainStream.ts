import { useState, useEffect, useRef, useCallback } from "react";
import { ETAResponse } from "../types";
import { getTrainETA, getTrainStreamURL } from "../services/api";

export function useTrainStream(trainNo: string, startDate?: string) {
  const [data, setData] = useState<ETAResponse | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef<number>(0);
  const activeStartDateRef = useRef<string | undefined>(startDate);

  // Keep track of active startDate across renders
  activeStartDateRef.current = startDate;

  const fetchInitial = useCallback(async () => {
    if (!trainNo) return;
    const requestedDate = startDate;
    try {
      setError(null);
      const initial = await getTrainETA(trainNo, requestedDate);
      // Discard if user has already switched away from this date
      if (activeStartDateRef.current !== requestedDate) return;
      if (initial) {
        if (requestedDate && initial.start_date && initial.start_date !== requestedDate) {
          return;
        }
        setData(initial);
      }
    } catch (err: unknown) {
      if (activeStartDateRef.current === requestedDate) {
        const msg = err instanceof Error ? err.message : "Failed to fetch ETA";
        setError(msg);
      }
    }
  }, [trainNo, startDate]);

  useEffect(() => {
    let isCancelled = false;
    if (!trainNo) return;

    fetchInitial();

    function cleanupWebSocket() {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null;
        // Strip all listeners immediately so closing never triggers onclose reconnect or onmessage updates
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        try {
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close();
          }
        } catch {
          // ignore
        }
      }
    }

    cleanupWebSocket();

    function connectWebSocket() {
      if (isCancelled) return;

      const wsUrl = getTrainStreamURL(trainNo, startDate);
      console.log("[WS] Connecting to:", wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isCancelled || ws !== wsRef.current) return;
        console.log(`[WS Connected] Stream opened for Train #${trainNo} (date: ${startDate || 'default'})`);
        setIsConnected(true);
        setError(null);
        retryCountRef.current = 0;
      };

      ws.onmessage = (event) => {
        if (isCancelled || ws !== wsRef.current) return;
        try {
          const payload: ETAResponse = JSON.parse(event.data);
          // Strict instance isolation: drop any packet that does not match the active instance
          if (startDate && payload.start_date && payload.start_date !== startDate) {
            return;
          }
          setData(payload);
        } catch (e) {
          console.warn("[WS Error] JSON parse failed:", e);
        }
      };

      ws.onerror = (e: unknown) => {
        if (isCancelled || ws !== wsRef.current) return;
        console.warn("[WS Error]:", e);
        setIsConnected(false);
      };

      ws.onclose = () => {
        if (isCancelled || ws !== wsRef.current) return;
        console.log(`[WS Disconnected] Closed for Train #${trainNo}`);
        setIsConnected(false);

        // Exponential backoff reconnect
        const delay = Math.min(1500 * Math.pow(1.5, retryCountRef.current), 8000);
        retryCountRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isCancelled && ws === wsRef.current) {
            connectWebSocket();
          }
        }, delay);
      };
    }

    connectWebSocket();

    return () => {
      isCancelled = true;
      cleanupWebSocket();
    };
  }, [trainNo, startDate, fetchInitial]);

  return { data, isConnected, error, refresh: fetchInitial };
}
