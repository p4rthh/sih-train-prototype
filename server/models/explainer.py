import shap
import pandas as pd
from typing import List, Dict, Any
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

        positive_drivers = [item for item in impacts if item["shap_impact"] > 0.3]
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
                "reason": "🟢 Normal operational schedule — no major disruptions detected",
                "severity": "LOW",
                "impact_min": 0.0
            })

        return reasons

    def _map_to_reason(self, feature: str, value: float, shap_impact: float) -> tuple:
        severity = "HIGH" if shap_impact >= 3.0 else ("MEDIUM" if shap_impact >= 1.0 else "LOW")

        if feature == "visibility_m" and value < 200.0:
            return f"🌫️ Dense Fog ({int(value)}m) — Speed restricted to 30 km/h for safety", "HIGH"
        elif feature == "visibility_m" and value < 500.0:
            return f"🌫️ Foggy Conditions ({int(value)}m) — Caution speed limit in effect (60 km/h)", severity
        elif feature == "precipitation_mm" and value > 15.0:
            return f"🌧️ Heavy Rainfall ({value:.1f} mm/h) — Track waterlogging caution order", severity
        elif feature == "upstream_train_delay" and value > 20.0:
            return f"🚂 Preceding train ahead is delayed by {int(value)}m — Block clearance wait", severity
        elif feature == "track_capacity" and int(value) == 1:
            return "🛤️ Single-Track Section — Waiting on loop line for crossing train to clear", severity
        elif feature == "train_priority" and value >= 5:
            return "⏸️ Precedence Control — Held on loop to let express service overtake", severity
        elif feature == "is_loco_reversal" and int(value) == 1:
            return "🔄 Locomotive Reversal / Engine Swap — Shunting & brake pipe testing in progress", severity
        elif feature == "sched_dwell_min" and value >= 15.0:
            return f"⏱️ Scheduled Major Technical Halt ({int(value)} min) — Crew change & watering", "LOW"
        elif feature == "delay_delta" and value > 5.0:
            return f"📈 Compounding delay trend — Lost {int(value)} mins in previous block section", severity
        elif feature == "temperature_c" and value > 44.0:
            return f"🌡️ Extreme Ambient Temperature ({value:.1f}°C) — Rail thermal expansion caution", severity
        elif feature == "fog_severity_index" and value > 0.7:
            return "🌫️ Dense corridor-wide fog — Systematic speed restriction active", "HIGH"

        elif feature == "is_overnight_recovery_window" and int(value) == 1:
            return "🌙 Overnight Speedup — Low traffic & green signals (23:00–05:30) enabling MPS catch-up", "LOW"
        elif feature == "recovery_slack_min" and value >= 5.0:
            return f"⏱️ Scheduled Slack Buffer ({int(value)} min) — Absorbing intermediate delay into timetable margin", "LOW"
        elif feature == "hist_recovery_rate" and value >= 0.8:
            return f"🚄 High Historical Catch-Up ({int(value * 100)}%) — Train historically recovers delay before destination", "LOW"

        return "", "LOW"
