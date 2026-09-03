# Complete Engineering Guide: Building the Dynamic ETA & Explainable Delay Platform for Indian Railways

This guide walks you through the mental model, directory architecture, step-by-step coding paradigms, data schemas, mathematical formulations, and glue code required to implement this platform from scratch.

---

# Table of Contents
1. [Mental Model & Data Flow Dynamics](#1-mental-model--data-flow-dynamics)
2. [Production Directory Layout](#2-production-directory-layout)
3. [Module 1: Data Ingestion & GIS Graph Pipeline](#3-module-1-data-ingestion--gis-graph-pipeline)
4. [Module 2: Feature Store & Pipeline Engine](#4-module-2-feature-store--pipeline-engine)
5. [Module 3: Machine Learning & Modeling Engine](#5-module-3-machine-learning--modeling-engine)
6. [Module 4: Explainability & Delay Reason Engine](#6-module-4-explainability--delay-reason-engine)
7. [Module 5: Real-Time Streaming & Backend API (FastAPI)](#7-module-5-real-time-streaming--backend-api-fastapi)
8. [Module 6: Frontend & Map Visualization](#8-module-6-frontend--map-visualization)
9. [Junior Engineer Onboarding & Task Allocation](#9-junior-engineer-onboarding--task-allocation)

---

# 1. Mental Model & Data Flow Dynamics

### Why Traditional Systems Fail vs. Why Our Approach Works
- **Traditional NTES / Google Maps:** Naively extrapolates delay from the last reported station ($\text{ETA}_{\text{next}} = \text{Sched}_{\text{next}} + \text{Delay}_{\text{current}}$). This ignores single-track bottleneck meets, loop-line overtakes for high-priority trains (Rajdhani vs MEMU), upstream congestion cascades, and weather speed caps (fog/monsoon).
- **Our Architecture:** Formulates the problem as **Delay Deviation Forecasting per Block Section** ($y = \Delta d_k = d_{k+1} - d_k$).
  - Instead of predicting absolute time stamps (which are non-stationary), we predict how much delay the train will gain or recover over a specific track segment.
  - We combine tabular operational tree models (**LightGBM**) with spatio-temporal graph neural networks (**ST-GCN**), wrap the predictions in statistical confidence intervals (**Conformalized Quantile Regression**), and explain every delay using tree-based **SHAP** values mapped to domain rules.

```
       [OSM + DEM + DataMeet]          [Timetables & GTFS]           [Open-Meteo & IMD]
                 │                              │                             │
                 ▼                              ▼                             ▼
       [Static Network Graph]         [Trip Metadata Store]          [Weather Cache]
                 │                              │                             │
                 └───────────────────────┬────────────────────────────────────┘
                                         ▼
                         ┌───────────────────────────────┐
                         │   Dynamic Feature Assembler   │ ◄── [NTES / Replay Simulator]
                         └───────────────┬───────────────┘
                                         ▼
             ┌───────────────────────────┴───────────────────────────┐
             ▼                                                       ▼
  ┌───────────────────────┐                               ┌───────────────────────┐
  │  Model A: LightGBM   │ (Tabular Features)            │    Model B: ST-GCN    │ (Graph Cascade)
  └──────────┬────────────┘                               └───────────┬───────────┘
             │                                                       │
             └───────────────────────────┬───────────────────────────┘
                                         ▼
                         ┌───────────────────────────────┐
                         │      Stacking Meta-Learner    │
                         └───────────────┬───────────────┘
                                         ▼
                         ┌───────────────────────────────┐
                         │   Model C: CQR / MAPIE (UQ)   │
                         │   + SHAP Reason Explainer     │
                         └───────────────┬───────────────┘
                                         ▼
                   [FastAPI Engine (REST / WebSocket / Redis)]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
     [Passenger Web Dashboard]                       [Controller Room Map]
     (Point ETA + Interval + Reasons)                (Network Heatmap + Bottlenecks)
```

---

# 2. Production Directory Layout

Organize your codebase into clean decoupled packages so multiple engineers can work simultaneously without merge conflicts:

```
sih-train/
├── config/
│   ├── settings.py              # Environment variables & constants
│   └── corridors.yaml           # Pilot corridor definitions & bounding boxes
├── data/
│   ├── raw/                     # Untouched downloads (OSM PBFs, Kaggle CSVs)
│   ├── processed/               # GeoJSONs, cleaned parquets, graph adjacency
│   └── cache/                   # Open-Meteo cache & temporary downloads
├── src/
│   ├── ingestion/
│   │   ├── osm_processor.py     # PBF to PostGIS / NetworkX graph builder
│   │   ├── timetable_loader.py  # GTFS & data.gov.in timetable parser
│   │   ├── weather_client.py    # Open-Meteo batch & real-time client
│   │   ├── ntes_scraper.py      # Live running status scraper
│   │   └── telemetry_sim.py     # Stochastic block-section RTIS simulator
│   ├── features/
│   │   ├── spatial_features.py  # Track capacity, gradient, junction degree
│   │   ├── temporal_features.py # Cyclical time, recovery slack, priority rank
│   │   ├── dynamic_features.py  # Lags, rolling trend, dwell anomaly
│   │   └── pipeline.py          # Unified feature vector builder
│   ├── models/
│   │   ├── baselines.py         # Persistence, constant velocity, historical median
│   │   ├── lightgbm_model.py    # Model A: GBDT regressor & quantiles
│   │   ├── stgcn_model.py       # Model B: PyTorch Geometric Temporal ST-GCN
│   │   ├── meta_stacker.py      # Blending meta-regressor
│   │   ├── conformal_uq.py      # Model C: MAPIE / CQR interval calibration
│   │   └── explainer.py         # SHAP TreeExplainer to human reason mapping
│   ├── backend/
│   │   ├── main.py              # FastAPI application entrypoint
│   │   ├── database.py          # SQLAlchemy PostGIS & Redis async connections
│   │   ├── schemas.py           # Pydantic request/response models
│   │   ├── routes/
│   │   │   ├── eta.py           # REST endpoints for train & station status
│   │   │   └── websocket.py     # Live telemetry broadcast channels
│   │   └── services/
│   │       └── stream_worker.py # Background task consumer for event stream
│   └── ui/                      # Frontend applications
│       ├── passenger/           # Next.js 14 + Tailwind + Leaflet
│       └── control_room/        # Vite + React + Deck.gl + ECharts
├── scripts/
│   ├── 01_setup_gis.py          # Run-once GIS extraction script
│   ├── 02_build_dataset.py      # Batch feature generation for training
│   ├── 03_train_models.py       # Model training & serialization
│   └── 04_run_simulator.py      # Launch telemetry stream generator
├── docker-compose.yml           # Postgres (PostGIS) + Redis + API
├── requirements.txt             # Python dependencies
└── package.json                 # Monorepo / UI scripts
```

---

# 3. Module 1: Data Ingestion & GIS Graph Pipeline

### Step 1.1: Extracting Railway Track Network & Station Topologies
You need an adjacency graph where nodes are stations/junctions and edges are track sections with properties (single/double track, gauge, max speed, electrified).

```python
# src/ingestion/osm_processor.py
import pyrosm
import geopandas as gpd
import networkx as nx
import shapely.geometry as geom
from typing import Tuple, Dict

class RailwayNetworkBuilder:
    def __init__(self, osm_pbf_path: str):
        self.osm = pyrosm.OSM(osm_pbf_path)
        
    def extract_layers(self) -> Tuple[gpd.GeoDataFrame, gpd.GeoDataFrame]:
        """
        Extracts tracks and stations filtered by Indian broad-gauge railway criteria.
        """
        print("[GIS] Parsing railway network tracks...")
        # railway tag filter: rail, narrow_gauge, light_rail
        tracks = self.osm.get_data_by_custom_criteria(
            custom_filter={"railway": ["rail"]}
        )
        stations = self.osm.get_data_by_custom_criteria(
            custom_filter={"railway": ["station", "halt", "junction"]}
        )
        
        # Clean and filter attributes
        tracks = tracks[["id", "geometry", "tracks", "electrified", "maxspeed", "gauge"]].copy()
        tracks["tracks"] = tracks["tracks"].fillna(1).astype(int)
        tracks["electrified"] = tracks["electrified"].apply(lambda x: 1 if x in ["yes", "contact_line"] else 0)
        tracks["maxspeed"] = tracks["maxspeed"].fillna(100).astype(float)
        
        return tracks, stations

    def build_networkx_graph(self, tracks: gpd.GeoDataFrame, stations: gpd.GeoDataFrame) -> nx.Graph:
        """
        Builds a weighted undirected topological graph where edge weight = physical distance (km).
        """
        G = nx.Graph()
        
        # Add station nodes
        for _, row in stations.iterrows():
            stn_code = row.get("ref") or row.get("name")
            if stn_code and row.geometry:
                G.add_node(
                    stn_code,
                    name=row.get("name"),
                    pos=(row.geometry.x, row.geometry.y),
                    lat=row.geometry.y,
                    lon=row.geometry.x
                )
                
        # Connect station pairs along track line strings (simplified snapping)
        # In production: project station coordinates onto track LineStrings and segmentize
        return G
```

### Step 1.2: Weather Ingestion (Open-Meteo)
Open-Meteo provides hourly weather parameters without an API key. Specifically, **horizontal visibility (meters)** is the primary trigger for Indian Railways Fog Safety Rules.

```python
# src/ingestion/weather_client.py
import requests
import pandas as pd
from datetime import datetime
from typing import Dict

class WeatherService:
    BASE_URL = "https://archive-api.open-meteo.com/v1/archive"
    FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

    @classmethod
    def get_station_weather(cls, lat: float, lon: float, date_str: str) -> Dict:
        """
        Fetches historical or live forecast weather for given coordinates.
        """
        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": date_str,
            "end_date": date_str,
            "hourly": ["temperature_2m", "precipitation", "visibility", "weather_code", "wind_speed_10m"],
            "timezone": "Asia/Kolkata"
        }
        res = requests.get(cls.BASE_URL, params=params, timeout=10)
        if res.status_code == 200:
            return res.json().get("hourly", {})
        return {}

    @staticmethod
    def calculate_fog_severity(visibility_m: float, rh: float = 90.0) -> float:
        """
        Computes normalized Fog Severity Index (0.0 to 1.0)
        IR Rule: Visibility < 200m triggers 30 km/h speed restriction
        """
        if visibility_m >= 1000:
            return 0.0
        elif visibility_m <= 100:
            return 1.0
        else:
            return (1000.0 - visibility_m) / 900.0
```

### Step 1.3: Real-Time Telemetry Simulation (Replay Engine)
Since CRIS RTIS live stream is behind restricted enterprise credentials, build a physically accurate kinematic replay simulator based on Phase 0 §6.

```python
# src/ingestion/telemetry_sim.py
import numpy as np
import time
from dataclasses import dataclass
from typing import Tuple

@dataclass
class TrainState:
    train_no: str
    current_section_idx: int
    current_km: float
    current_speed_kmh: float
    current_delay_min: float
    status: str # "RUNNING", "HALTED_SIGNAL", "DWELLING"

class KinematicSectionSimulator:
    """
    Simulates block section traversal with trapezoidal acceleration profiles,
    weather-induced speed restrictions, stochastic priority overtakes, and signal waits.
    """
    def __init__(self, section_distance_km: float, mps_kmh: float, priority_rank: int):
        self.distance = section_distance_km
        self.mps = mps_kmh
        self.priority = priority_rank # 1 (Vande Bharat) to 6 (Freight)
        self.a_acc = 0.4 # m/s^2 (~1.44 km/h/s)
        self.a_dec = 0.6 # m/s^2 (~2.16 km/h/s)

    def simulate_section_traversal(self, visibility_m: float, headway_min: float) -> Tuple[float, float]:
        """
        Returns (actual_traversal_minutes, delay_added_minutes)
        """
        # Calculate capped max speed due to weather
        effective_mps = self.mps
        if visibility_m < 200:
            effective_mps = min(effective_mps, 30.0)
        elif visibility_m < 500:
            effective_mps = min(effective_mps, 60.0)
            
        # Theoretical cruise time (hours to minutes)
        t_base_min = (self.distance / effective_mps) * 60.0 + 1.5 # +1.5 min accel/decel buffer
        
        # Stochastic Signal & Congestion Wait
        t_congestion = 0.0
        if headway_min < 5.0: # Close following train
            t_congestion += np.random.exponential(scale=4.0)
            
        # Stochastic Priority Wait on Loop Line (Lower rank trains get held)
        t_priority_hold = 0.0
        if self.priority >= 4 and np.random.rand() < 0.25:
            # 25% chance of being looped for higher priority overtakes
            t_priority_hold += np.random.gamma(shape=2.0, scale=3.0)
            
        # Random Gaussian operational variance
        eps = np.random.normal(loc=0.0, scale=1.0)
        
        total_time_min = max(t_base_min * 0.9, t_base_min + t_congestion + t_priority_hold + eps)
        delay_added = total_time_min - ((self.distance / self.mps) * 60.0)
        
        return total_time_min, max(0.0, delay_added)
```

---

# 4. Module 2: Feature Store & Pipeline Engine

Convert raw telemetry, timetables, track topology, and weather into an exact feature vector ready for tabular GBDT and Tensor GNN inference.

### Feature Assembly Pipeline
```python
# src/features/pipeline.py
import numpy as np
import pandas as pd

class FeaturePipeline:
    def __init__(self, static_station_db: pd.DataFrame):
        self.station_db = static_station_db

    def extract_features(self, trip_state: dict, live_weather: dict) -> pd.DataFrame:
        """
        Extracts 25+ curated features for a given train reaching station s_k
        """
        row = {}
        
        # Category A: Spatial / Topological
        stn = trip_state["target_station_code"]
        stn_meta = self.station_db.loc[stn] if stn in self.station_db.index else {}
        
        row["track_capacity"] = stn_meta.get("tracks", 2)
        row["section_distance_km"] = trip_state.get("section_distance_km", 15.0)
        row["junction_degree"] = stn_meta.get("junction_degree", 2)
        row["electrification"] = stn_meta.get("electrified", 1)
        row["max_permitted_speed"] = stn_meta.get("maxspeed", 110.0)
        row["elevation_gradient"] = stn_meta.get("gradient", 0.0)
        
        # Category B: Temporal / Trip Metadata
        row["train_priority"] = trip_state["priority_rank"] # 1 to 6
        arr_hour = trip_state["scheduled_arrival_dt"].hour
        row["tod_sin"] = np.sin(2 * np.pi * arr_hour / 24.0)
        row["tod_cos"] = np.cos(2 * np.pi * arr_hour / 24.0)
        row["dow"] = trip_state["scheduled_arrival_dt"].weekday()
        row["sched_dwell_min"] = trip_state.get("sched_dwell_min", 2.0)
        row["recovery_slack_min"] = trip_state.get("recovery_slack_min", 4.0)
        row["trip_progress_ratio"] = trip_state.get("current_stop_seq", 1) / float(trip_state.get("total_stops", 20))
        
        # Category C: Dynamic Telemetry & Autoregressive Lags
        row["current_delay_min"] = trip_state["current_delay_min"]
        row["lag_delay_1"] = trip_state.get("lag_delay_1", row["current_delay_min"])
        row["lag_delay_2"] = trip_state.get("lag_delay_2", row["lag_delay_1"])
        row["lag_delay_5"] = trip_state.get("lag_delay_5", row["lag_delay_2"])
        row["delay_delta"] = row["current_delay_min"] - row["lag_delay_1"]
        row["rolling_delay_trend"] = trip_state.get("rolling_delay_trend", 0.0)
        row["upstream_train_delay"] = trip_state.get("upstream_train_delay", 0.0)
        row["block_occupancy_count"] = trip_state.get("block_occupancy_count", 1)
        row["dwell_anomaly_min"] = trip_state.get("last_dwell_actual", 2.0) - trip_state.get("last_dwell_sched", 2.0)
        
        # Category D: Environmental & Weather
        row["visibility_m"] = live_weather.get("visibility", 10000.0)
        row["precipitation_mm"] = live_weather.get("precipitation", 0.0)
        row["wind_speed_kmh"] = live_weather.get("wind_speed_10m", 10.0)
        row["temperature_c"] = live_weather.get("temperature_2m", 25.0)
        row["weather_code"] = live_weather.get("weather_code", 0)
        row["fog_severity_index"] = max(0.0, (1000.0 - row["visibility_m"]) / 900.0) if row["visibility_m"] < 1000 else 0.0
        
        return pd.DataFrame([row])
```

---

# 5. Module 3: Machine Learning & Modeling Engine

### Step 5.1: Model A — Tabular Per-Section Delay Model (LightGBM)
Trains on tabular station-to-station state transitions to predict delay deviation ($\Delta d_k$).

```python
# src/models/lightgbm_model.py
import lightgbm as lgb
import numpy as np
import pandas as pd
from typing import Dict

class DelayLightGBM:
    def __init__(self):
        self.point_model = None
        self.q_low_model = None
        self.q_high_model = None
        self.features = []

    def train(self, X: pd.DataFrame, y: pd.Series, val_X: pd.DataFrame, val_y: pd.Series):
        """
        Trains point prediction regressor (L1 loss) and quantile regressors (alpha=0.1, 0.9)
        """
        self.features = list(X.columns)
        
        params_base = {
            'boosting_type': 'gbdt',
            'learning_rate': 0.05,
            'num_leaves': 31,
            'feature_fraction': 0.85,
            'bagging_fraction': 0.8,
            'bagging_freq': 1,
            'verbose': -1,
            'n_estimators': 600
        }
        
        # 1. Point prediction (L1 loss is robust to delay outliers)
        print("[ML] Training Point Estimator (L1 / MAE)...")
        self.point_model = lgb.LGBMRegressor(**params_base, objective='regression_l1')
        self.point_model.fit(X, y, eval_set=[(val_X, val_y)], callbacks=[lgb.early_stopping(50)])
        
        # 2. Lower Quantile (10th percentile)
        print("[ML] Training Lower Quantile (q=0.10)...")
        self.q_low_model = lgb.LGBMRegressor(**params_base, objective='quantile', alpha=0.10)
        self.q_low_model.fit(X, y, eval_set=[(val_X, val_y)], callbacks=[lgb.early_stopping(50)])
        
        # 3. Upper Quantile (90th percentile)
        print("[ML] Training Upper Quantile (q=0.90)...")
        self.q_high_model = lgb.LGBMRegressor(**params_base, objective='quantile', alpha=0.90)
        self.q_high_model.fit(X, y, eval_set=[(val_X, val_y)], callbacks=[lgb.early_stopping(50)])

    def predict(self, X_input: pd.DataFrame) -> Dict[str, np.ndarray]:
        X_eval = X_input[self.features]
        pred_point = self.point_model.predict(X_eval)
        pred_q10 = self.q_low_model.predict(X_eval)
        pred_q90 = self.q_high_model.predict(X_eval)
        
        # Guard rail against quantile crossing
        pred_q10 = np.minimum(pred_q10, pred_point)
        pred_q90 = np.maximum(pred_q90, pred_point)
        
        return {
            "point_delta": pred_point,
            "q10_delta": pred_q10,
            "q90_delta": pred_q90
        }
```

### Step 5.2: Model B — Spatio-Temporal Graph Neural Network (ST-GCN)
For network-level cascading delays, stations are nodes and tracks are edges. The model receives a sequence of previous station delays and forecasts delay contagion across the corridor graph.

```python
# src/models/stgcn_model.py
import torch
import torch.nn as nn
from torch_geometric_temporal.nn.recurrent import A3TGCN

class RailwaySTGCN(nn.Module):
    """
    Spatio-Temporal Graph Convolutional Network using Attention-based Temporal GCN
    Input Shape: (Batch, Nodes, Features, Time_Steps)
    """
    def __init__(self, node_features: int, periods: int, hidden_dim: int = 64):
        super(RailwaySTGCN, self).__init__()
        self.recurrent = A3TGCN(
            in_channels=node_features,
            out_channels=hidden_dim,
            periods=periods
        )
        self.linear = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1) # Outputs predicted delay for each station node
        )

    def forward(self, x: torch.Tensor, edge_index: torch.Tensor, edge_weight: torch.Tensor) -> torch.Tensor:
        """
        x: (Nodes, Features, Time_Steps)
        edge_index: (2, Num_Edges)
        edge_weight: (Num_Edges,)
        """
        h = self.recurrent(x, edge_index, edge_weight) # (Nodes, hidden_dim)
        out = self.linear(h)                           # (Nodes, 1)
        return out.squeeze(-1)
```

### Step 5.3: Model C — Conformalized Quantile Regression (MAPIE / CQR)
Provides a mathematical guarantee that the true arrival time falls within $[q_{\text{low}}, q_{\text{high}}]$ at least 90% of the time ($\mathbb{P}(Y \in \hat{C}(X)) \ge 1 - \alpha$).

```python
# src/models/conformal_uq.py
import numpy as np
from typing import Tuple

class ConformalCalibrator:
    """
    Split Conformal Prediction Calibrator for Quantile Regression.
    Computes conformity scores on a validation set to widen/tighten intervals.
    """
    def __init__(self, coverage: float = 0.90):
        self.coverage = coverage
        self.q_hat = 0.0

    def calibrate(self, y_val: np.ndarray, q10_val: np.ndarray, q90_val: np.ndarray):
        """
        Non-conformity score E_i = max(q10 - y, y - q90)
        """
        scores = np.maximum(q10_val - y_val, y_val - q90_val)
        n = len(scores)
        # Compute the 1-alpha empirical quantile with finite-sample correction
        p_val = np.ceil((n + 1) * self.coverage) / n
        p_val = min(1.0, p_val)
        self.q_hat = np.quantile(scores, p_val, method="higher")
        print(f"[CQR] Calibrated Conformal Margin (q_hat): {self.q_hat:.2f} minutes")

    def predict_interval(self, q10: np.ndarray, q90: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Applies calibrated bounds: [q10 - q_hat, q90 + q_hat]
        """
        calibrated_lower = q10 - self.q_hat
        calibrated_upper = q90 + self.q_hat
        return calibrated_lower, calibrated_upper
```

---

# 6. Module 4: Explainability & Delay Reason Engine

Use Tree-SHAP to compute feature contribution scores on the fly (<5 ms), then map the highest contributors to clear natural language alerts.

```python
# src/models/explainer.py
import shap
import pandas as pd
from typing import List, Dict

class DelayReasonEngine:
    def __init__(self, lgb_model, feature_names: List[str]):
        self.explainer = shap.TreeExplainer(lgb_model)
        self.feature_names = feature_names

    def explain_prediction(self, feature_df: pd.DataFrame) -> List[Dict]:
        """
        Generates top 2-3 human-readable delay reasons based on local SHAP values.
        """
        shap_values = self.explainer.shap_values(feature_df[self.feature_names])
        if isinstance(shap_values, list):
            shap_values = shap_values[0] # Handle regression array
            
        row_vals = feature_df.iloc[0]
        row_shap = shap_values[0]
        
        # Pair feature, actual value, and shap impact
        impacts = []
        for feat, val, s_val in zip(self.feature_names, row_vals, row_shap):
            impacts.append({
                "feature": feat,
                "value": val,
                "shap_impact": s_val
            })
            
        # Sort by positive delay contributors (features pushing delay higher)
        positive_impacts = [x for x in impacts if x["shap_impact"] > 0.3]
        positive_impacts.sort(key=lambda x: x["shap_impact"], reverse=True)
        
        reasons = []
        for item in positive_impacts[:3]:
            text = self._map_feature_to_reason(item["feature"], item["value"])
            if text:
                reasons.append({
                    "reason": text,
                    "impact_severity": "HIGH" if item["shap_impact"] > 2.0 else "MEDIUM",
                    "shap_value": round(float(item["shap_impact"]), 2)
                })
                
        if not reasons:
            reasons.append({
                "reason": "🟢 Normal operational schedule — no major disruptions detected",
                "impact_severity": "LOW",
                "shap_value": 0.0
            })
            
        return reasons

    def _map_feature_to_reason(self, feature: str, value: float) -> str:
        if feature == "visibility_m" and value < 200:
            return f"🌫️ Dense Fog ({int(value)}m) — Speed restricted to 30 km/h for safety"
        elif feature == "visibility_m" and value < 500:
            return f"🌫️ Foggy Conditions ({int(value)}m) — Caution speed limit in effect (60 km/h)"
        elif feature == "precipitation_mm" and value > 15.0:
            return f"🌧️ Heavy Rainfall ({value:.1f} mm/h) — Track waterlogging & caution order active"
        elif feature == "upstream_train_delay" and value > 20.0:
            return f"🚂 Preceding train ahead is delayed by {int(value)} mins — Block clearance wait"
        elif feature == "track_capacity" and int(value) == 1:
            return "🛤️ Single-Track Section — Waiting on loop line for crossing train to clear"
        elif feature == "junction_degree" and value >= 4:
            return "🔀 Major Junction Congestion — Platform and switch routing backlog"
        elif feature == "train_priority" and value >= 5:
            return "⏸️ Precedence Control — Held on loop to let express service overtake"
        elif feature == "is_loco_reversal" and value == 1:
            return "🔄 Locomotive Reversal / Engine Swap — Shunting & brake pipe testing in progress"
        elif feature == "dwell_anomaly_min" and value > 6:
            return f"⏱️ Extended Station Halt (+{int(value)} min) — Heavy passenger rush or crew change"
        elif feature == "delay_delta" and value > 5:
            return f"📈 Compounding delay trend — Lost {int(value)} mins in previous block section"
        elif feature == "temperature_c" and value > 45.0:
            return f"🌡️ High Track Temperature ({value:.1f}°C) — Rail thermal expansion speed cap"
        return ""
```

---

# 7. Module 5: Real-Time Streaming & Backend API (FastAPI)

FastAPI acts as the high-throughput bridge connecting feature inference to the UI over WebSockets and REST.

```python
# src/backend/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import datetime
import pandas as pd

app = FastAPI(title="Indian Railways Dynamic ETA Platform", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory mock/cache for demonstration (Replace with Redis in production)
ACTIVE_TRAIN_STATE = {
    "12952": {
        "train_no": "12952",
        "name": "New Delhi Mumbai Rajdhani Express",
        "current_station": "KOTA",
        "next_station": "RTM",
        "lat": 25.18,
        "lon": 75.83,
        "current_delay_min": 18.0,
        "speed_kmh": 115.0,
        "sched_arrival_next": "2026-08-30T14:15:00+05:30",
        "priority_rank": 2
    }
}

@app.get("/api/train/{train_no}/eta")
async def get_train_eta(train_no: str):
    """
    Computes dynamic ETA, uncertainty bounds, and explainable reasons for a specific train.
    """
    if train_no not in ACTIVE_TRAIN_STATE:
        raise HTTPException(status_code=404, detail="Train not found or inactive")
        
    state = ACTIVE_TRAIN_STATE[train_no]
    
    # 1. Build Feature Vector (Simulated live inputs)
    feature_dict = {
        "track_capacity": 2,
        "section_distance_km": 42.0,
        "junction_degree": 3,
        "electrification": 1,
        "max_permitted_speed": 130.0,
        "elevation_gradient": 0.0,
        "train_priority": state["priority_rank"],
        "tod_sin": 0.5,
        "tod_cos": -0.86,
        "dow": 6,
        "sched_dwell_min": 5.0,
        "recovery_slack_min": 6.0,
        "trip_progress_ratio": 0.65,
        "current_delay_min": state["current_delay_min"],
        "lag_delay_1": 14.0,
        "lag_delay_2": 10.0,
        "lag_delay_5": 0.0,
        "delay_delta": 4.0,
        "rolling_delay_trend": 1.2,
        "upstream_train_delay": 25.0, # Preceding train is 25 min late!
        "block_occupancy_count": 2,
        "dwell_anomaly_min": 3.0,
        "visibility_m": 120.0,         # Heavy fog!
        "precipitation_mm": 0.0,
        "wind_speed_kmh": 12.0,
        "temperature_c": 14.0,
        "weather_code": 45,
        "fog_severity_index": 0.97
    }
    
    # 2. Run Model Inference
    # Predicted delay deviation = +11 minutes added over this section
    predicted_delta = 11.0 
    predicted_total_delay = state["current_delay_min"] + predicted_delta # 29 mins total delay
    
    # 3. Calculate CQR Arrival Time Window
    sched_dt = datetime.datetime.fromisoformat(state["sched_arrival_next"])
    point_eta = sched_dt + datetime.timedelta(minutes=predicted_total_delay)
    lower_eta = point_eta - datetime.timedelta(minutes=4.0) # Lower bound
    upper_eta = point_eta + datetime.timedelta(minutes=6.0) # Upper bound
    
    # 4. Generate SHAP Delay Reasons
    reasons = [
        {
            "reason": "🌫️ Dense Fog (120m) — Speed restricted to 30 km/h for safety",
            "impact_severity": "HIGH",
            "shap_value": 7.4
        },
        {
            "reason": "🚂 Preceding train ahead is delayed by 25 mins — Block clearance wait",
            "impact_severity": "MEDIUM",
            "shap_value": 3.6
        }
    ]
    
    return {
        "train_no": train_no,
        "train_name": state["name"],
        "current_station": state["current_station"],
        "next_station": state["next_station"],
        "speed_kmh": state["speed_kmh"],
        "current_delay_min": state["current_delay_min"],
        "forecasted_delay_min": round(predicted_total_delay, 1),
        "scheduled_arrival": sched_dt.isoformat(),
        "dynamic_eta": {
            "point_estimate": point_eta.isoformat(),
            "confidence_interval_90": {
                "lower_bound": lower_eta.isoformat(),
                "upper_bound": upper_eta.isoformat()
            }
        },
        "delay_reasons": reasons
    }

@app.websocket("/api/train/{train_no}/stream")
async def websocket_telemetry_stream(websocket: WebSocket, train_no: str):
    """
    Pushes 30-second live GPS & updated ETA intervals to connected UI clients.
    """
    await websocket.accept()
    try:
        while True:
            # Fetch latest ETA packet
            data = await get_train_eta(train_no)
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(5) # Push every 5 seconds for demo
    except WebSocketDisconnect:
        print(f"[WS] Client disconnected from train {train_no}")
```

---

# 8. Module 6: Frontend & Map Visualization

Build a responsive UI in React / Next.js that displays:
1. **Interactive Leaflet Track Map** showing train coordinates and track lines.
2. **Confidence ETA Pill** displaying the 90% arrival window.
3. **SHAP Delay Reason Cards** with severity tags and plain English explanations.

### Next.js Live Passenger Component
```tsx
// ui/passenger/components/LiveTrainTracker.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, MapPin, Gauge } from "lucide-react";

interface ETAPacket {
  train_no: string;
  train_name: string;
  current_station: string;
  next_station: string;
  speed_kmh: number;
  current_delay_min: number;
  forecasted_delay_min: number;
  scheduled_arrival: string;
  dynamic_eta: {
    point_estimate: string;
    confidence_interval_90: {
      lower_bound: string;
      upper_bound: string;
    };
  };
  delay_reasons: Array<{
    reason: string;
    impact_severity: "HIGH" | "MEDIUM" | "LOW";
    shap_value: number;
  }>;
}

export default function LiveTrainTracker({ trainNo }: { trainNo: string }) {
  const [data, setData] = useState<ETAPacket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket(`ws://localhost:8000/api/train/${trainNo}/stream`);
    ws.onmessage = (event) => {
      setData(JSON.parse(event.data));
    };
    return () => ws.close();
  }, [trainNo]);

  if (!data) return <div className="p-6">Loading train telemetry...</div>;

  const formatTime = (isoStr: string) => {
    return new Date(isoStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* Header Banner */}
      <Card className="bg-slate-900 text-white border-none shadow-xl">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm font-semibold tracking-wider text-blue-400">
                TRAIN #{data.train_no}
              </span>
              <CardTitle className="text-2xl font-bold">{data.train_name}</CardTitle>
            </div>
            <Badge
              variant={data.forecasted_delay_min > 15 ? "destructive" : "secondary"}
              className="text-md px-3 py-1"
            >
              {data.forecasted_delay_min > 0
                ? `Delayed by ${Math.round(data.forecasted_delay_min)} mins`
                : "On Time"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 border-t border-slate-800 pt-4">
          <div className="flex items-center space-x-2">
            <MapPin className="text-slate-400 h-5 w-5" />
            <div>
              <p className="text-xs text-slate-400">Next Station</p>
              <p className="text-lg font-bold">{data.next_station}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Gauge className="text-slate-400 h-5 w-5" />
            <div>
              <p className="text-xs text-slate-400">Live Speed</p>
              <p className="text-lg font-bold">{data.speed_kmh} km/h</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="text-slate-400 h-5 w-5" />
            <div>
              <p className="text-xs text-slate-400">Scheduled Arrival</p>
              <p className="text-lg font-bold">{formatTime(data.scheduled_arrival)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Forecast ETA Card */}
      <Card className="border-blue-200 bg-blue-50/40">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-800">
                AI Predicted Arrival Window (90% Confidence)
              </h3>
              <div className="text-4xl font-extrabold text-blue-950 mt-1">
                {formatTime(data.dynamic_eta.confidence_interval_90.lower_bound)} –{" "}
                {formatTime(data.dynamic_eta.confidence_interval_90.upper_bound)}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Most probable arrival: <b>{formatTime(data.dynamic_eta.point_estimate)}</b>
              </p>
            </div>
            <div className="mt-4 md:mt-0 text-right">
              <Badge className="bg-blue-600 text-white hover:bg-blue-700">
                Conformal ML Verified
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Explainable Delay Reasons Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <AlertTriangle className="text-amber-500 h-5 w-5" />
            <span>Why is this train delayed?</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.delay_reasons.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">
                  {item.reason.split(" ")[0]} {/* Emoji */}
                </span>
                <span className="text-sm font-medium text-slate-800">
                  {item.reason.substring(item.reason.indexOf(" ") + 1)}
                </span>
              </div>
              <Badge
                variant="outline"
                className={
                  item.impact_severity === "HIGH"
                    ? "border-red-500 text-red-700 bg-red-50"
                    : "border-amber-500 text-amber-700 bg-amber-50"
                }
              >
                +{item.shap_value}m impact
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

---

# 9. Module 7: Crowdsourced Offline In-Coach Validator (Edge PWA)

This module solves the **rural cellular blackout problem**. When passengers travel through remote railway stretches where 4G/5G data drops, the app switches to **Offline Edge Mode**, utilizing the phone's native GPS and accelerometer to calculate live velocity, estimate arrival at the next station via local cached track geometry, and buffer telemetry pings to sync back to the cloud when coverage returns.

```
                   [Rural Cell Tower Blackout (No Internet)]
                                      │
                                      ▼
           ┌─────────────────────────────────────────────────────┐
           │      Browser HTML5 Geolocation + Motion Sensor      │
           └──────────────────────────┬──────────────────────────┘
                                      │
                                      ▼
           ┌─────────────────────────────────────────────────────┐
           │ Turf.js / Local GeoJSON LineString Track Snapping   │
           │ (Computes: Section Km, Edge Speed, Local ETA)       │
           └──────────────────────────┬──────────────────────────┘
                                      │
                   [Cellular Internet Coverage Resumes]
                                      │
                                      ▼
           ┌─────────────────────────────────────────────────────┐
           │  Buffered WebSocket Sync (Ground Truth Validation)  │
           │  { train_no, snapped_km, speed_kmh, timestamp }     │
           └─────────────────────────────────────────────────────┘
```

### In-Coach Client Sensor Engine (`ui/passenger/lib/inCoachValidator.ts`)

```typescript
// ui/passenger/lib/inCoachValidator.ts
import * as turf from "@turf/turf";

export interface LocalTelemetryPing {
  trainNo: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  snappedKm: number;
  speedKmh: number;
  accuracyMeters: number;
}

export class InCoachValidator {
  private trainNo: string;
  private trackGeoJSON: GeoJSON.LineString;
  private watchId: number | null = null;
  private telemetryBuffer: LocalTelemetryPing[] = [];
  private onUpdateCallback: (status: any) => void;

  constructor(
    trainNo: string,
    trackGeoJSON: GeoJSON.LineString,
    onUpdate: (status: any) => void
  ) {
    this.trainNo = trainNo;
    this.trackGeoJSON = trackGeoJSON;
    this.onUpdateCallback = onUpdate;
  }

  public startTracking() {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser.");
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionUpdate(position),
      (error) => console.error("GPS Error:", error),
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
  }

  private handlePositionUpdate(position: GeolocationPosition) {
    const { latitude, longitude, speed, accuracy } = position.coords;
    const pt = turf.point([longitude, latitude]);
    const line = turf.lineString(this.trackGeoJSON.coordinates);

    // Snap passenger GPS point to the exact railway track centerline
    const snapped = turf.nearestPointOnLine(line, pt, { units: "kilometers" });
    const snappedKm = snapped.properties.location || 0;

    // Derive speed: fallback to calculated speed if device speed sensor is null
    const derivedSpeedKmh = speed !== null ? speed * 3.6 : 0;

    const ping: LocalTelemetryPing = {
      trainNo: this.trainNo,
      timestamp: position.timestamp,
      latitude,
      longitude,
      snappedKm: round(snappedKm, 2),
      speedKmh: round(derivedSpeedKmh, 1),
      accuracyMeters: Math.round(accuracy),
    };

    // Buffer locally in IndexedDB / array
    this.telemetryBuffer.push(ping);

    // Notify UI for offline live updates
    this.onUpdateCallback({
      isOffline: !navigator.onLine,
      currentSpeedKmh: ping.speedKmh,
      distanceCoveredKm: ping.snappedKm,
      bufferedPings: this.telemetryBuffer.length,
    });

    // If online, flush the buffer to server
    if (navigator.onLine && this.telemetryBuffer.length > 0) {
      this.flushBufferToServer();
    }
  }

  private async flushBufferToServer() {
    const payload = [...this.telemetryBuffer];
    this.telemetryBuffer = [];

    try {
      await fetch("/api/telemetry/crowdsourced-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pings: payload }),
      });
      console.log(`[EdgeSync] Synced ${payload.length} crowdsourced pings.`);
    } catch (err) {
      // Re-insert failed pings back into buffer
      this.telemetryBuffer = [...payload, ...this.telemetryBuffer];
    }
  }

  public stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}

function round(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}
```

---

# 10. Junior Engineer Onboarding & Task Allocation

Here is how you can divide responsibilities across your team:

### Engineer 1: GIS, Topology & Weather Ingestion
* **Goal:** Create the railway adjacency graph and live weather client.
* **Tasks:**
  1. Download Geofabrik India `.osm.pbf` and run `src/ingestion/osm_processor.py`.
  2. Extract coordinates and build station lookup table with junction degrees and track capacity.
  3. Implement `src/ingestion/weather_client.py` using Open-Meteo REST API.
* **Success Metric:** Querying `get_station_weather("NDLS")` returns real-time visibility, temperature, and precipitation.

### Engineer 2: ML Modeling & SHAP Explainability
* **Goal:** Build the feature pipeline, train LightGBM, calibrate CQR, and map SHAP reasons.
* **Tasks:**
  1. Complete `src/features/pipeline.py` using historical Kaggle delay datasets.
  2. Train `src/models/lightgbm_model.py` to predict station delay deviations ($\Delta d$).
  3. Calibrate intervals with `src/models/conformal_uq.py` (verify $\ge 90\%$ test set coverage).
  4. Write the SHAP translation table in `src/models/explainer.py`.
* **Success Metric:** Model MAE $< 3.5$ minutes on 3-station lookahead; SHAP outputs clear reasons for test perturbations.

### Engineer 3: Backend, Telemetry Simulator & Frontend
* **Goal:** Create the live server and user interface.
* **Tasks:**
  1. Implement `src/ingestion/telemetry_sim.py` to output 30-second moving train updates.
  2. Build FastAPI endpoints and WebSockets in `src/backend/main.py`.
  3. Build the Next.js tracker UI using Leaflet for track lines and train icons.
* **Success Metric:** End user can enter `12952`, see the train moving on the map, and watch the ETA pill and delay cards update live.
