import { TrainSearchResult, ETAResponse, StationBoardItem } from "../types";
import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Automatically resolves the correct backend host address.
 */
function resolveBackendHost(): string {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ??
      (Constants as any).manifest?.debuggerHost ??
      (Constants as any).manifest2?.extra?.expoClient?.hostUri;

    if (hostUri && typeof hostUri === "string") {
      // If running via Expo ngrok tunnel (e.g. xxxx.ngrok.io or xxxx.exp.direct)
      if (hostUri.includes("ngrok") || hostUri.includes("exp.direct")) {
        // Will be configured or fall back
        return hostUri.split(":")[0];
      }
      const ip = hostUri.split(":")[0];
      if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
        return ip;
      }
    }
  } catch (err) {
    console.warn("[API] Could not resolve host from Expo Constants:", err);
  }

  return Platform.OS === "android" ? "10.0.2.2" : "localhost";
}

let currentHost = resolveBackendHost();

export const getActiveHost = () => currentHost;

export const setCustomHost = (newHost: string) => {
  let clean = newHost.trim();
  // Strip trailing slash
  clean = clean.replace(/\/+$/, "");
  currentHost = clean;
  console.log("[API] Backend target configured to:", currentHost);
};

export const getApiBaseUrl = (): string => {
  const host = currentHost.trim();

  // If already a full URL (e.g. https://xxxx.ngrok-free.app)
  if (host.startsWith("http://") || host.startsWith("https://")) {
    return host;
  }

  // If it's an ngrok or public tunnel domain without protocol
  if (host.includes("ngrok") || host.includes("loca.lt") || host.includes("trycloudflare.com")) {
    return `https://${host}`;
  }

  // Standard LAN IP or localhost
  const hostWithPort = host.includes(":") ? host : `${host}:8000`;
  return `http://${hostWithPort}`;
};

export const getWsBaseUrl = (): string => {
  const apiBase = getApiBaseUrl();

  // If HTTPS -> use secure WebSocket WSS
  if (apiBase.startsWith("https://")) {
    return apiBase.replace("https://", "wss://");
  }

  // If HTTP -> use WS
  if (apiBase.startsWith("http://")) {
    return apiBase.replace("http://", "ws://");
  }

  return `ws://${currentHost}:8000`;
};

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true", // Bypasses ngrok free tier interstitial warning page
};

export async function searchTrains(query: string): Promise<TrainSearchResult[]> {
  if (!query || query.trim().length === 0) return [];
  try {
    const url = `${getApiBaseUrl()}/api/trains/search?q=${encodeURIComponent(query.trim())}`;
    const res = await fetch(url, { headers: DEFAULT_HEADERS });
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] searchTrains failed at ${getApiBaseUrl()}:`, err);
    return [];
  }
}

export async function getTrainETA(trainNo: string): Promise<ETAResponse | null> {
  try {
    const url = `${getApiBaseUrl()}/api/train/${encodeURIComponent(trainNo)}/eta`;
    const res = await fetch(url, { headers: DEFAULT_HEADERS });
    if (!res.ok) throw new Error(`ETA failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] getTrainETA failed for ${trainNo} at ${getApiBaseUrl()}:`, err);
    return null;
  }
}

export async function getStationBoard(stationCode: string): Promise<StationBoardItem[]> {
  try {
    const url = `${getApiBaseUrl()}/api/station/${encodeURIComponent(stationCode)}/board`;
    const res = await fetch(url, { headers: DEFAULT_HEADERS });
    if (!res.ok) throw new Error(`Station board failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] getStationBoard failed for ${stationCode} at ${getApiBaseUrl()}:`, err);
    return [];
  }
}

export async function searchTrainsBetweenStations(
  fromStn: string,
  toStn: string,
  expressOnly: boolean = true
): Promise<any[]> {
  if (!fromStn || !toStn) return [];
  try {
    const url = `${getApiBaseUrl()}/api/trains/route?from_stn=${encodeURIComponent(fromStn.trim())}&to_stn=${encodeURIComponent(toStn.trim())}&express_only=${expressOnly}`;
    const res = await fetch(url, { headers: DEFAULT_HEADERS });
    if (!res.ok) throw new Error(`Route search failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] searchTrainsBetweenStations failed at ${getApiBaseUrl()}:`, err);
    return [];
  }
}

export async function searchStations(query: string): Promise<any[]> {
  if (!query || query.trim().length < 1) return [];
  try {
    const url = `${getApiBaseUrl()}/api/stations/search?q=${encodeURIComponent(query.trim())}`;
    const res = await fetch(url, { headers: DEFAULT_HEADERS });
    if (!res.ok) throw new Error(`Station search failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] searchStations failed at ${getApiBaseUrl()}:`, err);
    return [];
  }
}

export async function getPnrStatus(pnrNo: string): Promise<any | null> {
  if (!pnrNo || pnrNo.trim().length < 10) return null;
  try {
    const url = `${getApiBaseUrl()}/api/pnr/${encodeURIComponent(pnrNo.trim())}`;
    const res = await fetch(url, { headers: DEFAULT_HEADERS });
    if (!res.ok) throw new Error(`PNR lookup failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] getPnrStatus failed for ${pnrNo} at ${getApiBaseUrl()}:`, err);
    return null;
  }
}

export function getTrainStreamURL(trainNo: string): string {
  const wsUrl = `${getWsBaseUrl()}/api/train/${encodeURIComponent(trainNo)}/stream`;
  return wsUrl;
}
