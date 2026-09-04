import math
import datetime
import pandas as pd
from typing import Dict, Any, List, Optional
from server.models.recovery_engine import HistoricalRecoveryEngine

FEATURE_NAMES = [
    "current_delay_min",
    "lag_delay_1",
    "lag_delay_2",
    "lag_delay_5",
    "delay_delta",
    "rolling_delay_trend",
    "section_distance_km",
    "track_capacity",
    "max_permitted_speed",
    "train_priority",
    "sched_dwell_min",
    "recovery_slack_min",
    "trip_progress_ratio",
    "is_origin_station",
    "tod_sin",
    "tod_cos",
    "dow",
    "visibility_m",
    "precipitation_mm",
    "temperature_c",
    "wind_speed_kmh",
    "weather_code",
    "fog_severity_index",
    "upstream_train_delay",
    "is_loco_reversal",
    "hist_recovery_rate",
    "is_overnight_recovery_window",
    "dist_to_destination_km",
    "hist_on_time_pct"
]

class FeaturePipeline:
    @classmethod
    def extract_features(cls, state: Dict[str, Any], weather: Dict[str, Any], dt: Optional[datetime.datetime] = None) -> pd.DataFrame:
        if dt is None:
            dt = datetime.datetime.now()

        hour = dt.hour + (dt.minute / 60.0)
        tod_sin = round(math.sin(2 * math.pi * hour / 24.0), 4)
        tod_cos = round(math.cos(2 * math.pi * hour / 24.0), 4)
        dow = dt.weekday()

        curr_delay = float(state.get("current_delay_min", 0.0))
        delays = state.get("delay_history", [curr_delay])

        lag_1 = float(delays[-2]) if len(delays) >= 2 else curr_delay
        lag_2 = float(delays[-3]) if len(delays) >= 3 else lag_1
        lag_5 = float(delays[-6]) if len(delays) >= 6 else lag_2

        delay_delta = curr_delay - lag_1

        if len(delays) >= 3:
            recent_deltas = [delays[i] - delays[i-1] for i in range(max(1, len(delays)-3), len(delays))]
            rolling_trend = sum(recent_deltas) / len(recent_deltas)
        else:
            rolling_trend = delay_delta

        stop_idx = int(state.get("current_stop_idx", 0))
        tot_stops = max(1, int(state.get("total_stops", 20)))
        progress_ratio = round(min(1.0, stop_idx / float(tot_stops)), 3)

        sched_dwell = float(state.get("sched_dwell_min", 2.0))
        is_reversal = 1 if (sched_dwell >= 20.0 or state.get("is_loco_reversal", False)) else 0

        vis = float(weather.get("visibility_m", 10000.0))
        fog_idx = float(weather.get("fog_severity_index", 0.0))

        # Historical behavior profiles
        train_no = str(state.get("train_no", "12952"))
        priority = int(state.get("priority_rank", 2))
        profile = HistoricalRecoveryEngine.get_historical_train_profile(train_no, priority)

        is_overnight = 1 if (hour >= 22.5 or hour <= 5.5) else 0
        rem_dist = float(state.get("dist_to_destination_km", max(20.0, (tot_stops - stop_idx) * 25.0)))

        row = {
            "current_delay_min": curr_delay,
            "lag_delay_1": lag_1,
            "lag_delay_2": lag_2,
            "lag_delay_5": lag_5,
            "delay_delta": delay_delta,
            "rolling_delay_trend": round(rolling_trend, 2),
            "section_distance_km": float(state.get("section_distance_km", 15.0)),
            "track_capacity": int(state.get("track_capacity", 2)),
            "max_permitted_speed": float(state.get("max_permitted_speed", 110.0)),
            "train_priority": priority,
            "sched_dwell_min": sched_dwell,
            "recovery_slack_min": float(state.get("recovery_slack_min", 4.0)),
            "trip_progress_ratio": progress_ratio,
            "is_origin_station": 1 if stop_idx == 0 else 0,
            "tod_sin": tod_sin,
            "tod_cos": tod_cos,
            "dow": dow,
            "visibility_m": vis,
            "precipitation_mm": float(weather.get("precipitation_mm", 0.0)),
            "temperature_c": float(weather.get("temperature_c", 28.0)),
            "wind_speed_kmh": float(weather.get("wind_speed_kmh", 12.0)),
            "weather_code": int(weather.get("weather_code", 1)),
            "fog_severity_index": fog_idx,
            "upstream_train_delay": float(state.get("upstream_train_delay", 0.0)),
            "is_loco_reversal": is_reversal,
            "hist_recovery_rate": float(profile["recovery_rate"]),
            "is_overnight_recovery_window": is_overnight,
            "dist_to_destination_km": rem_dist,
            "hist_on_time_pct": float(profile["punctuality"])
        }

        return pd.DataFrame([row])[FEATURE_NAMES]
