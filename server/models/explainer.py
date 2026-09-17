import shap
import pandas as pd
from typing import List, Dict, Any, Tuple
from server.features.pipeline import FEATURE_NAMES

class DelayReasonEngine:
    def __init__(self, lightgbm_point_model):
        self.explainer = shap.TreeExplainer(lightgbm_point_model)

    def explain(self, features_df: pd.DataFrame) -> List[Dict[str, Any]]:
        X = features_df[FEATURE_NAMES]
        shap_vals = self.explainer.shap_values(X)
        if isinstance(shap_vals, list):
            shap_vals = shap_vals[0]

        row = X.iloc[0]
        vals = shap_vals[0] if len(shap_vals.shape) > 1 else shap_vals

        impacts = []
        for feat, val, s in zip(FEATURE_NAMES, row, vals):
            impacts.append({
                "feature": feat,
                "value": float(val),
                "shap_impact": float(s)
            })

        positive_drivers = [item for item in impacts if item["shap_impact"] > 0.20]
        positive_drivers.sort(key=lambda x: x["shap_impact"], reverse=True)

        reasons = []
        for d in positive_drivers[:3]:
            text, severity = self._map_to_reason(d["feature"], d["value"], d["shap_impact"])
            if text:
                reasons.append({
                    "reason": text,
                    "severity": severity,
                    "impact_min": round(d["shap_impact"], 1)
                })

        if not reasons:
            reasons.append({
                "reason": "Normal operational schedule — no major disruptions detected",
                "severity": "LOW",
                "impact_min": 0.0
            })

        return reasons

    def _map_to_reason(self, feature: str, value: float, shap_impact: float) -> Tuple[str, str]:
        severity = "HIGH" if shap_impact >= 3.0 else ("MEDIUM" if shap_impact >= 1.0 else "LOW")

        # Weather & Visibility
        if feature == "visibility_m" and value < 200.0:
            return f"Dense Fog ({int(value)}m) — Speed restricted to 30 km/h for safety", "HIGH"
        elif feature == "visibility_m" and value < 500.0:
            return f"Foggy Conditions ({int(value)}m) — Caution speed limit in effect (60 km/h)", severity
        elif feature == "visibility_m" and value < 1000.0:
            return f"Reduced Visibility ({int(value)}m) — Caution signals active", "LOW"
        elif feature == "fog_severity_index" and value > 0.6:
            return "Corridor-wide fog — Systematic speed restriction active", "HIGH"
        elif feature == "fog_severity_index" and value > 0.2:
            return "Moderate fog along corridor — Controlled running speed", severity
        elif feature == "precipitation_mm" and value > 15.0:
            return f"Heavy Rainfall ({value:.1f} mm/h) — Track waterlogging caution order", severity
        elif feature == "precipitation_mm" and value > 5.0:
            return f"Rainfall along section ({value:.1f} mm/h) — Wet rails, extended braking margin", "LOW"
        elif feature == "temperature_c" and value > 43.0:
            return f"Extreme Ambient Temperature ({value:.1f}C) — Rail thermal expansion caution", severity
        elif feature == "wind_speed_kmh" and value > 40.0:
            return f"High Crosswinds ({int(value)} km/h) — OHE stability speed restriction", severity
        elif feature == "is_monsoon_season" and int(value) == 1:
            return "Monsoon caution order — Wet rail adhesion braking limits", severity

        # Precedence & Traffic
        elif feature == "upstream_train_delay" and value > 10.0:
            return f"Preceding train ahead delayed by {int(value)}m — Block clearance queue", severity
        elif feature == "track_capacity" and int(value) == 1:
            return "Single-Track Section — Waiting on loop line for crossing train to clear", severity
        elif feature == "train_priority" and value >= 4:
            return "Precedence Control — Held on loop to let premier service overtake", severity
        elif feature == "is_junction_station" and int(value) == 1:
            return "Approaching major railway junction — Route setting and signaling clearance", severity
        elif feature == "avg_hist_delay_at_this_station" and value > 4.0:
            return f"Historical Bottleneck Station — Average past congestion delay of {int(value)}m", severity

        # Operational Halts & Reversals
        elif feature == "is_loco_reversal" and int(value) == 1:
            return "Locomotive Reversal / Engine Swap — Shunting & brake pipe testing in progress", severity
        elif feature == "sched_dwell_min" and value >= 15.0:
            return f"Scheduled Major Technical Halt ({int(value)} min) — Crew change & watering", "LOW"
        elif feature == "sched_dwell_min" and value >= 8.0:
            return f"Extended Scheduled Halt ({int(value)} min) — High passenger boarding volume", "LOW"

        # Compounding Lag & Trends
        elif feature == "delay_delta" and value > 3.0:
            return f"Compounding delay trend — Lost {int(value)} mins in previous block section", severity
        elif feature == "delay_acceleration" and value > 1.5:
            return "Accelerating delay rate — Congestion compounding downstream", severity
        elif feature == "rolling_delay_trend" and value > 2.0:
            return f"Consecutive section delay trend (+{value:.1f}m/station)", severity
        elif feature in ["lag_delay_1", "lag_delay_2", "lag_delay_5"] and value > 10.0:
            return f"Persistent upstream delay ({int(value)}m) carried forward from earlier stations", severity
        elif feature == "current_delay_min" and value > 10.0:
            return f"Active delay momentum ({int(value)}m) carrying into upcoming section", severity
        elif feature == "max_delay_so_far" and value > 15.0:
            return f"Residual impact from peak journey disruption ({int(value)}m earlier)", severity
        elif feature == "cumulative_delay_min" and value > 15.0:
            return f"Corridor-wide cumulative delay buildup ({int(value)}m)", severity

        # Route & Geometry
        elif feature == "section_distance_km" and value > 80.0:
            return f"Long inter-station section ({int(value)} km) — Extended transit time without bypass", "LOW"
        elif feature == "dist_to_destination_km" and value < 50.0:
            return "Final destination approach — Terminal track occupancy regulation", "LOW"
        elif feature == "stops_remaining" and value <= 2:
            return "Terminal approach sequence — Approaching destination yard", "LOW"
        elif feature == "section_scheduled_transit_min" and value > 60.0:
            return f"Long scheduled transit slot ({int(value)}m) — Higher exposure to sectional regulation", "LOW"

        # Seasonal, Calendar, Slack & Recovery
        elif feature == "is_holiday_or_festival" and int(value) == 1:
            return "Peak travel volume — Increased platform dwell & passenger boarding time", severity
        elif feature == "is_overnight_recovery_window" and int(value) == 1:
            return "Overnight Speedup — Low traffic (22:30–05:30) enabling MPS catch-up", "LOW"
        elif feature in ["recovery_slack_min", "section_slack_min"] and value >= 3.0:
            return f"Scheduled Slack Buffer ({int(value)} min) — Absorbing intermediate delay into timetable", "LOW"
        elif feature == "is_terminal_approach" and int(value) == 1:
            return "Terminal Approach — Final corridor buffer absorbing residual delay", "LOW"
        elif feature == "hist_recovery_rate" and value >= 0.70:
            return f"High Historical Catch-Up ({int(value * 100)}%) — Train historically recovers delay before destination", "LOW"

        # Dynamic fallback for any other driving feature
        readable_name = feature.replace("_", " ").title()
        return f"Operational sectional factor ({readable_name}) — localized regulation", severity
