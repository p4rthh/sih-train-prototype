import { TrainSearchResult, ETAResponse, StationBoardItem } from "../types";
import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Automatically resolves the correct backend host address.
 * 
 * 1. When running on a physical device via Expo Go, extracts the computer's
 *    LAN IP address directly from Metro's hostUri (e.g. 192.168.1.x).
 * 2. When running in the standard Android emulator, falls back to 10.0.2.2.
 * 3. When running on iOS simulator or web, uses localhost.
 */
function resolveBackendHost(): string {
  try {
    // Check Expo hostUri (contains the IP address of the machine running Metro)
    const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any).manifest?.debuggerHost ?? (Constants as any).manifest2?.extra?.expoClient?.hostUri;
    if (hostUri && typeof hostUri === "string") {
      const ip = hostUri.split(":")[0];
      if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
        return ip;
      }
    }
  } catch (err) {
    console.warn("[API] Could not resolve host from Expo Constants:", err);
  }

  // Fallback defaults
  return Platform.OS === "android" ? "10.0.2.2" : "localhost";
}

let currentHost = resolveBackendHost();
export const getActiveHost = () => currentHost;
export const setCustomHost = (newHost: string) => {
  currentHost = newHost.trim();
  console.log("[API] Backend host overridden to:", currentHost);
};

export const getApiBaseUrl = () => `http://${currentHost}:8000`;
export const getWsBaseUrl = () => `ws://${currentHost}:8000`;

export async function searchTrains(query: string): Promise<TrainSearchResult[]> {
  if (!query || query.trim().length === 0) return [];
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/trains/search?q=${encodeURIComponent(query.trim())}`);
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] searchTrains failed at ${getApiBaseUrl()}:`, err);
    return [];
  }
}

export async function getTrainETA(trainNo: string): Promise<ETAResponse | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/train/${encodeURIComponent(trainNo)}/eta`);
    if (!res.ok) throw new Error(`ETA failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] getTrainETA failed for ${trainNo} at ${getApiBaseUrl()}:`, err);
    return null;
  }
}

export async function getStationBoard(stationCode: string): Promise<StationBoardItem[]> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/station/${encodeURIComponent(stationCode)}/board`);
    if (!res.ok) throw new Error(`Station board failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] getStationBoard failed for ${stationCode} at ${getApiBaseUrl()}:`, err);
    return [];
  }
}

export function getTrainStreamURL(trainNo: string): string {
  return `${getWsBaseUrl()}/api/train/${encodeURIComponent(trainNo)}/stream`;
}
