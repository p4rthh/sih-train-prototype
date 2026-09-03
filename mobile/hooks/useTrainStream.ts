import { useState, useEffect, useRef, useCallback } from "react";
import { ETAResponse } from "../types";
import { getTrainETA, getTrainStreamURL } from "../services/api";

export function useTrainStream(trainNo: string) {
  const [data, setData] = useState<ETAResponse | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchInitial = useCallback(async () => {
    if (!trainNo) return;
    try {
      const initial = await getTrainETA(trainNo);
      if (initial) {
        setData(initial);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch ETA");
    }
  }, [trainNo]);

  useEffect(() => {
    if (!trainNo) return;

    fetchInitial();

    const wsUrl = getTrainStreamURL(trainNo);
    console.log("[WS] Connecting to:", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`[WS Connected] Stream opened for Train #${trainNo}`);
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const payload: ETAResponse = JSON.parse(event.data);
        setData(payload);
      } catch (e) {
        console.warn("[WS Error] JSON parse failed:", e);
      }
    };

    ws.onerror = (e: any) => {
      console.warn("[WS Error]:", e.message || "WebSocket error");
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log(`[WS Disconnected] Closed for Train #${trainNo}`);
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [trainNo, fetchInitial]);

  return { data, isConnected, error, refresh: fetchInitial };
}
