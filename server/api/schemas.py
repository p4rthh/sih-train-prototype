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
    severity: str # "HIGH", "MEDIUM", "LOW"
    impact_min: float

class RouteStop(BaseModel):
    seq: int
    station_code: str
    station_name: str
    status: str # "departed", "current", "upcoming"
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

class StationBoardItem(BaseModel):
    train_number: str
    train_name: str
    scheduled_time: str
    predicted_eta: str
    delay_min: float
    status: str
    delay_tag: str
