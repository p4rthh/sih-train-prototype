export interface TrainSearchResult {
  train_number: string;
  train_name: string;
}

export interface ConfidenceInterval {
  lower: string;
  upper: string;
}

export interface DynamicETA {
  point_estimate: string;
  confidence_90: ConfidenceInterval;
}

export interface DelayReason {
  reason: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  impact_min: number;
}

export interface RouteStop {
  seq: number;
  station_code: string;
  station_name: string;
  status: "departed" | "current" | "upcoming";
  scheduled_arrival?: string;
  scheduled_departure?: string;
  delay_min?: number;
  eta?: string;
  lat?: number;
  lon?: number;
}

export interface ETAResponse {
  train_no: string;
  train_name: string;
  current_station_code: string;
  current_station_name: string;
  next_station_code: string;
  next_station_name: string;
  lat: number;
  lon: number;
  speed_kmh: number;
  current_delay_min: number;
  forecasted_delay_min: number;
  scheduled_arrival: string;
  dynamic_eta: DynamicETA;
  delay_reasons: DelayReason[];
  route_progress: RouteStop[];
  telemetry_source?: string;
  live_position_desc?: string;
}

export interface StationBoardItem {
  train_number: string;
  train_name: string;
  scheduled_time: string;
  predicted_eta: string;
  delay_min: number;
  status: "ON_TIME" | "DELAYED";
  delay_tag: string;
}
