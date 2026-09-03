import { TrainSearchResult, ETAResponse, StationBoardItem } from "../types";
import { Platform } from "react-native";

// Default host based on platform:
// iOS Simulator uses localhost
// Android Emulator uses 10.0.2.2
// Physical devices can connect via machine LAN IP (e.g. 192.168.x.x)
const DEFAULT_HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";
export const API_BASE_URL = `http://${DEFAULT_HOST}:8000`;
export const WS_BASE_URL = `ws://${DEFAULT_HOST}:8000`;

export async function searchTrains(query: string): Promise<TrainSearchResult[]> {
  if (!query || query.trim().length === 0) return [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/trains/search?q=${encodeURIComponent(query.trim())}`);
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[API] searchTrains error:", err);
    return [];
  }
}

export async function getTrainETA(trainNo: string): Promise<ETAResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/train/${encodeURIComponent(trainNo)}/eta`);
    if (!res.ok) throw new Error(`ETA failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] getTrainETA error for ${trainNo}:`, err);
    return null;
  }
}

export async function getStationBoard(stationCode: string): Promise<StationBoardItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/station/${encodeURIComponent(stationCode)}/board`);
    if (!res.ok) throw new Error(`Station board failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[API] getStationBoard error for ${stationCode}:`, err);
    return [];
  }
}

export function getTrainStreamURL(trainNo: string): string {
  return `${WS_BASE_URL}/api/train/${encodeURIComponent(trainNo)}/stream`;
}
