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
    "hist_on_time_pct",
    "section_slack_min",
    "cumulative_delay_min",
    "stops_remaining",
    "train_number_hash",
    "section_scheduled_transit_min",
    "is_junction_station",
    "zone_id",
    "is_terminal_approach",
    "delay_acceleration",
    "max_delay_so_far",
    "is_holiday_or_festival",
    "is_monsoon_season",
    "avg_hist_delay_at_this_station"
]

KNOWN_REVERSAL_STATIONS = {
    "ALD", "PRYJ", "DDU", "MGS", "BPL", "ET", "NGP", "VSKP",
    "GDA", "KOTA", "RTM", "BRC", "CNB", "LKO", "LJN", "ASR"
}

KNOWN_JUNCTION_CODES = {
    "NDLS", "BCT", "MMCT", "HWH", "CSMT", "MAS", "SBC", "PUNE",
    "MTJ", "KOTA", "RTM", "BRC", "ST", "CNB", "PRYJ", "DDU",
    "BPL", "ET", "NGP", "GZB", "ALJN", "TDL", "BSB", "PNBE",
    "BZA", "GTL", "VKB", "SC", "GKP", "MB", "BE", "GDA"
}

ZONE_MAP = {
    "NR": 0, "WR": 1, "CR": 2, "ER": 3, "ECR": 4, "NCR": 5,
    "WCR": 6, "SR": 7, "SCR": 8, "SWR": 9, "SECR": 10, "SER": 11,
    "ECOR": 12, "NFR": 13, "NWR": 14
}

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
        delays = state.get("delay_history") or [curr_delay]
        if not delays:
            delays = [curr_delay]

        lag_1 = float(delays[-2]) if len(delays) >= 2 else curr_delay
        lag_2 = float(delays[-3]) if len(delays) >= 3 else lag_1
        lag_5 = float(delays[-6]) if len(delays) >= 6 else lag_2

        delay_delta = curr_delay - lag_1

        if len(delays) >= 3:
            recent_deltas = [delays[i] - delays[i - 1] for i in range(max(1, len(delays) - 3), len(delays))]
            rolling_trend = sum(recent_deltas) / float(len(recent_deltas))
            delay_accel = (delays[-1] - delays[-2]) - (delays[-2] - delays[-3])
        else:
            rolling_trend = delay_delta
            delay_accel = 0.0

        delay_accel = max(-20.0, min(20.0, float(delay_accel)))

        stop_idx = int(state.get("current_stop_idx", 0))
        tot_stops = max(1, int(state.get("total_stops", 20)))
        progress_ratio = round(min(1.0, stop_idx / float(tot_stops)), 3)
        stops_remaining = max(0, tot_stops - 1 - stop_idx)

        sched_dwell = float(state.get("sched_dwell_min", 2.0))
        curr_stn = str(state.get("current_station_code", "")).strip().upper()
        curr_stn_name = str(state.get("current_station_name", "")).strip().upper()

        is_reversal = 1 if (
            sched_dwell >= 20.0
            or state.get("is_loco_reversal", False)
            or curr_stn in KNOWN_REVERSAL_STATIONS
        ) else 0

        vis = float(weather.get("visibility_m", 10000.0))
        fog_idx = float(weather.get("fog_severity_index", 0.0))

        train_no = str(state.get("train_no", "12952")).strip()
        priority = int(state.get("priority_rank", 2))
        profile = HistoricalRecoveryEngine.get_historical_train_profile(train_no, priority)

        is_overnight = 1 if (hour >= 22.5 or hour <= 5.5) else 0
        rem_dist = float(state.get("dist_to_destination_km", max(15.0, stops_remaining * 25.0)))
        sec_dist = float(state.get("section_distance_km", 15.0))
        max_speed = float(state.get("max_permitted_speed", 110.0))

        # Calculate section scheduled transit time
        sched_transit = float(state.get("section_scheduled_transit_min", 0.0))
        if sched_transit <= 0.0:
            prev_dep = state.get("prev_departure_time")
            curr_arr = state.get("scheduled_arrival_time")
            if prev_dep and curr_arr:
                try:
                    dh, dm = map(int, str(prev_dep).split(":")[:2])
                    ah, am = map(int, str(curr_arr).split(":")[:2])
                    dur = (ah * 60 + am) - (dh * 60 + dm)
                    if dur < 0:
                        dur += 1440
                    if 4.0 <= dur <= 360.0:
                        sched_transit = float(dur)
                except Exception:
                    pass

        if sched_transit <= 0.0:
            sched_transit = max(5.0, (sec_dist / max(40.0, max_speed)) * 60.0 + 3.0)

        # Compute timetable buffer slack
        min_physical_min = (sec_dist / max(40.0, max_speed)) * 60.0 + 1.5
        calculated_slack = max(0.0, sched_transit - min_physical_min)
        calculated_slack = min(calculated_slack, max(2.0, sec_dist * 0.25))

        # Station metadata
        is_jn = 1 if ("JN" in curr_stn_name or curr_stn in KNOWN_JUNCTION_CODES) else 0
        zone_str = str(state.get("zone", "NR")).strip().upper()
        zone_id = ZONE_MAP.get(zone_str, 0)
        is_term_approach = 1 if stops_remaining <= 3 else 0

        # Seasonal and calendar factors
        is_monsoon = 1 if dt.month in [6, 7, 8, 9] else 0
        MAJOR_INDIAN_HOLIDAYS = {
            (1, 26), (3, 14), (3, 15), (4, 11), (8, 15), (10, 2),
            (10, 20), (10, 21), (10, 22), (10, 23), (10, 24),
            (11, 1), (11, 2), (11, 3), (11, 4), (11, 7), (11, 8), (12, 25)
        }
        is_holiday = 1 if (dow >= 5 or (dt.month, dt.day) in MAJOR_INDIAN_HOLIDAYS) else 0

        # Train number hash
        try:
            t_num_int = int("".join(c for c in train_no if c.isdigit()) or "0")
            train_hash = float(t_num_int % 256)
        except Exception:
            train_hash = float(abs(hash(train_no)) % 256)

        max_delay = float(max(delays)) if delays else curr_delay
        cum_delay = max(0.0, min(120.0, curr_delay))

        # Station historical delay estimate
        stn_bottleneck_prob = profile.get("station_bottleneck_probability", {}).get(curr_stn, 0.0)
        avg_hist_delay = (stn_bottleneck_prob * 15.0) if stn_bottleneck_prob > 0 else profile.get("avg_departure_delay_min", 3.0)

        # Track capacity
        track_cap = int(state.get("track_capacity", 2))
        if track_cap not in [1, 2, 3, 4]:
            track_cap = 1 if "SINGLE" in curr_stn_name else 2

        # Punctuality normalization
        raw_on_time = profile.get("historical_on_time_pct", profile.get("punctuality", 80.0))
        try:
            val_f = float(raw_on_time)
            hist_on_time_norm = val_f / 100.0 if val_f > 1.0 else val_f
        except Exception:
            hist_on_time_norm = 0.80

        # Halt recovery dwell buffer vs section running slack
        halt_dwell_slack = max(0.0, sched_dwell - (2.0 if sched_dwell <= 5.0 else 5.0))

        row = {
            "current_delay_min": curr_delay,
            "lag_delay_1": lag_1,
            "lag_delay_2": lag_2,
            "lag_delay_5": lag_5,
            "delay_delta": delay_delta,
            "rolling_delay_trend": round(rolling_trend, 2),
            "section_distance_km": sec_dist,
            "track_capacity": track_cap,
            "max_permitted_speed": max_speed,
            "train_priority": priority,
            "sched_dwell_min": sched_dwell,
            "recovery_slack_min": round(halt_dwell_slack, 2),
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
            "hist_recovery_rate": float(profile.get("recovery_rate") or profile.get("median_recovery_rate", 0.70)),
            "is_overnight_recovery_window": is_overnight,
            "dist_to_destination_km": rem_dist,
            "hist_on_time_pct": round(hist_on_time_norm, 3),
            "section_slack_min": round(calculated_slack, 2),
            "cumulative_delay_min": cum_delay,
            "stops_remaining": stops_remaining,
            "train_number_hash": train_hash,
            "section_scheduled_transit_min": round(sched_transit, 2),
            "is_junction_station": is_jn,
            "zone_id": zone_id,
            "is_terminal_approach": is_term_approach,
            "delay_acceleration": round(delay_accel, 2),
            "max_delay_so_far": round(max_delay, 2),
            "is_holiday_or_festival": is_holiday,
            "is_monsoon_season": is_monsoon,
            "avg_hist_delay_at_this_station": round(avg_hist_delay, 2)
        }

        return pd.DataFrame([row])[FEATURE_NAMES]
