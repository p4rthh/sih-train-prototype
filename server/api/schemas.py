from typing import List, Optional
from pydantic import BaseModel

class TrainSearchResult(BaseModel):
    train_number: str
    train_name: str

class ConfidenceInterval(BaseModel):
    lower: str
    upper: str

class DynamicETA(BaseModel):
    point_estimate: str
    confidence_90: ConfidenceInterval

class DelayReason(BaseModel):
    reason: str
    severity: str
    impact_min: float

class RouteStop(BaseModel):
    seq: int
    station_code: str
    station_name: str
    status: str
    scheduled_arrival: Optional[str] = None
    scheduled_departure: Optional[str] = None
    delay_min: Optional[float] = None
    eta: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None

class ETAResponse(BaseModel):
    train_no: str
    train_name: str
    current_station_code: str
    current_station_name: str
    next_station_code: str
    next_station_name: str
    lat: float
    lon: float
    speed_kmh: float
    current_delay_min: float
    forecasted_delay_min: float
    scheduled_arrival: str
    dynamic_eta: DynamicETA
    delay_reasons: List[DelayReason]
    route_progress: List[RouteStop]
    telemetry_source: Optional[str] = "NTES_REALTIME"
    live_position_desc: Optional[str] = None
    model_b_stgcn_delta: Optional[float] = None
    ensemble_blend_ratio: Optional[str] = "62% LightGBM + 38% ST-GCN"

class StationBoardItem(BaseModel):
    train_number: str
    train_name: str
    scheduled_time: str
    predicted_eta: str
    delay_min: float
    status: str
    delay_tag: str

class RouteSearchResultItem(BaseModel):
    train_number: str
    train_name: str
    from_station_code: str
    from_station_name: str
    from_departure: str
    to_station_code: str
    to_station_name: str
    to_arrival: str
    duration: str
    stop_count: int

class StationSearchResult(BaseModel):
    station_code: str
    station_name: str
    state: Optional[str] = None
    zone: Optional[str] = None

class PNRPassenger(BaseModel):
    number: int
    booking_status: str
    current_status: str
    coach: str
    berth: str

class PNRResponse(BaseModel):
    pnr: str
    train_number: str
    train_name: str
    date_of_journey: str
    from_station_code: str
    from_station_name: str
    to_station_code: str
    to_station_name: str
    boarding_time: str
    passengers: List[PNRPassenger]
    chart_prepared: bool
    source: str
