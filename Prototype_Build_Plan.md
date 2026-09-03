# 🚀 Prototype Build Plan — SIH Dynamic ETA & Explainable Delay Platform

> **Purpose:** This document is a complete, agent-handoff-ready build specification for producing a working MVP prototype for the Smart India Hackathon first round.
> **Scope:** Covers ~75% of the full production app. Excludes only the most complex features (ST-GCN Graph Neural Network, Control Room Console, In-Coach Offline Validator).
> **Target:** A working **React Native mobile app** backed by a **FastAPI + SQLite** server that demonstrates real-time train tracking, AI-powered ETA prediction with confidence intervals, and explainable delay reasons.

---

## Table of Contents

1. [Prototype Scope: What's IN vs. What's OUT](#1-prototype-scope-whats-in-vs-whats-out)
2. [Architecture Overview (Prototype)](#2-architecture-overview-prototype)
3. [Directory Structure](#3-directory-structure)
4. [Module 1: Backend Data Layer (FastAPI + SQLite)](#4-module-1-backend-data-layer)
5. [Module 2: Timetable & Station Ingestion](#5-module-2-timetable--station-ingestion)
6. [Module 3: Weather Ingestion (Open-Meteo)](#6-module-3-weather-ingestion)
7. [Module 4: Telemetry Simulator (Kinematic Engine)](#7-module-4-telemetry-simulator)
8. [Module 5: Feature Pipeline](#8-module-5-feature-pipeline)
9. [Module 6: Model A — LightGBM Delay Predictor](#9-module-6-model-a--lightgbm-delay-predictor)
10. [Module 7: CQR Confidence Interval Calibration](#10-module-7-cqr-confidence-interval-calibration)
11. [Module 8: SHAP Delay Reason Engine](#11-module-8-shap-delay-reason-engine)
12. [Module 9: FastAPI REST + WebSocket Server](#12-module-9-fastapi-rest--websocket-server)
13. [Module 10: React Native Mobile App](#13-module-10-react-native-mobile-app)
14. [Data Contracts & API Schemas](#14-data-contracts--api-schemas)
15. [Build Order & Task Parallelization](#15-build-order--task-parallelization)
16. [Demo Script for Judges](#16-demo-script-for-judges)

---

## 1. Prototype Scope: What's IN vs. What's OUT

### ✅ INCLUDED IN PROTOTYPE (75% of full app)

| Feature | Module | Priority |
|:---|:---|:---|
| Pan-India timetable ingestion (5,208 trains, 8,539 stations) | Backend | P0 |
| Real-time weather ingestion (Open-Meteo: visibility, precipitation, fog) | Backend | P0 |
| Kinematic train simulator (trapezoidal speed profile + weather caps + priority holds) | Backend | P0 |
| Feature pipeline (25+ features: spatial, temporal, dynamic, environmental) | ML | P0 |
| **Model A: LightGBM** (point delay prediction + quantile regression for bounds) | ML | P0 |
| **CQR: Conformalized Quantile Regression** (90% guaranteed arrival intervals) | ML | P0 |
| **SHAP Delay Reason Engine** (top 3 human-readable delay causes) | ML | P0 |
| FastAPI backend (REST endpoints + WebSocket live stream) | Backend | P0 |
| React Native mobile app — Train Search screen | Frontend | P0 |
| React Native mobile app — Live Map with train dot on real track geometry | Frontend | P0 |
| React Native mobile app — Dynamic ETA Card with confidence interval bar | Frontend | P0 |
| React Native mobile app — "Why is my train delayed?" reason cards | Frontend | P0 |
| React Native mobile app — Station Board (all trains at a station) | Frontend | P1 |
| Historical delay stats per train (7/30-day punctuality) | Backend | P1 |
| NTES live delay integration (anchor correction) | Backend | P1 |

### ❌ EXCLUDED FROM PROTOTYPE (Deferred to Final Build)

| Feature | Reason for Deferral |
|:---|:---|
| **Model B: ST-GCN Graph Neural Network** | Requires PyTorch Geometric Temporal + corridor-specific graph tensor training. Mention in slides as "planned architecture tier". |
| **Stacking Meta-Learner (Ridge)** | Not needed without Model B. LightGBM alone is the prototype predictor. |
| **Control Room Console (Deck.gl + React)** | Separate app targeting railway operators. Out of scope for passenger-facing demo. |
| **In-Coach Offline Validator (Edge PWA)** | Requires PWA + IndexedDB + Turf.js edge processing. Mention in slides as innovation. |
| **Full OSM GIS Pipeline (pyrosm + PostGIS)** | Use pre-extracted station coordinates from DataMeet JSON instead. |
| **Docker / Kafka / Redis Streams** | Use SQLite + in-memory Python dicts for prototype speed. |
| **Connecting Train Risk Score** | Nice-to-have. Add if time permits. |

---

## 2. Architecture Overview (Prototype)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (Python)                               │
│                                                                          │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────────────────┐   │
│  │ DataMeet     │   │ Open-Meteo   │   │ Kinematic Simulator        │   │
│  │ Timetable DB │   │ Weather API  │   │ (Trapezoidal Speed Model)  │   │
│  │ (SQLite)     │   │ (No API Key) │   │ + NTES Anchor (Optional)   │   │
│  └──────┬───────┘   └──────┬───────┘   └──────────────┬──────────────┘   │
│         │                  │                          │                  │
│         └──────────────────┼──────────────────────────┘                  │
│                            ▼                                             │
│              ┌──────────────────────────┐                               │
│              │  Feature Pipeline (25+)  │                               │
│              └────────────┬─────────────┘                               │
│                           ▼                                             │
│              ┌──────────────────────────┐                               │
│              │ Model A: LightGBM       │                               │
│              │  • Point Prediction     │                               │
│              │  • Quantile q10 / q90   │                               │
│              └────────────┬─────────────┘                               │
│                           ▼                                             │
│         ┌─────────────────┴────────────────┐                           │
│         ▼                                  ▼                           │
│  ┌──────────────┐                ┌─────────────────┐                   │
│  │ CQR Wrapper  │                │ SHAP Explainer  │                   │
│  │ (90% Bounds) │                │ (Delay Reasons) │                   │
│  └──────┬───────┘                └────────┬────────┘                   │
│         └──────────────┬──────────────────┘                            │
│                        ▼                                               │
│         ┌──────────────────────────────┐                               │
│         │ FastAPI Server               │                               │
│         │  • GET /api/train/{no}/eta   │                               │
│         │  • GET /api/station/{code}   │                               │
│         │  • WS  /api/train/{no}/stream│                               │
│         └──────────────┬───────────────┘                               │
└────────────────────────┼─────────────────────────────────────────────────┘
                         │ (JSON over HTTP / WebSocket)
                         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    REACT NATIVE MOBILE APP                              │
│                                                                          │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────────────┐  │
│  │ Train Search │  │ Live Track Map   │  │ Dynamic ETA Card          │  │
│  │ Screen       │  │ (react-native-   │  │ "14:32 – 14:47" ± 90%    │  │
│  │              │  │  maps / Mapbox)  │  │ + Delay Reason Cards     │  │
│  └──────────────┘  └──────────────────┘  └───────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Structure

```
sih-train/
├── server/                          # Python Backend
│   ├── config.py                    # Constants, corridor definitions
│   ├── database.py                  # SQLite setup & query helpers
│   ├── ingestion/
│   │   ├── timetable_loader.py      # DataMeet schedules.json → SQLite
│   │   ├── station_coords.py        # Station lat/lon from trains.json (DataMeet)
│   │   └── weather_client.py        # Open-Meteo hourly weather fetcher
│   ├── simulator/
│   │   └── kinematic_engine.py      # Trapezoidal speed profile + weather caps
│   ├── features/
│   │   └── pipeline.py              # 25-feature vector assembly
│   ├── models/
│   │   ├── lightgbm_model.py        # Model A: train + predict + serialize
│   │   ├── conformal_uq.py          # CQR calibration
│   │   ├── explainer.py             # SHAP → human reason mapping
│   │   └── trained/                 # Serialized model files (.pkl, .json)
│   │       ├── lgb_point.pkl
│   │       ├── lgb_q10.pkl
│   │       ├── lgb_q90.pkl
│   │       └── cqr_params.json
│   ├── api/
│   │   ├── main.py                  # FastAPI app entrypoint
│   │   ├── schemas.py               # Pydantic request/response models
│   │   ├── routes_eta.py            # Train ETA & station board endpoints
│   │   └── routes_ws.py             # WebSocket live stream handler
│   ├── scripts/
│   │   ├── 01_setup_database.py     # One-time: ingest timetable + stations → SQLite
│   │   ├── 02_generate_training.py  # Build training DataFrame from simulator runs
│   │   └── 03_train_model.py        # Train LightGBM + calibrate CQR + save
│   ├── data/
│   │   ├── raw/                     # schedules.json, trains.json (auto-downloaded)
│   │   ├── processed/               # training_data.parquet
│   │   └── sih_train.db             # SQLite database
│   └── requirements.txt
│
├── mobile/                          # React Native App (Expo)
│   ├── app/                         # Expo Router file-based routing
│   │   ├── (tabs)/
│   │   │   ├── index.tsx            # Home / Train Search screen
│   │   │   ├── map.tsx              # Live Map screen
│   │   │   └── station.tsx          # Station Board screen
│   │   ├── train/
│   │   │   └── [trainNo].tsx        # Train Detail: ETA + Reasons + Map
│   │   └── _layout.tsx              # Tab navigator layout
│   ├── components/
│   │   ├── TrainSearchBar.tsx        # Autocomplete train number/name
│   │   ├── LiveTrackMap.tsx          # MapView with train marker + track polyline
│   │   ├── ETACard.tsx              # Confidence interval display
│   │   ├── DelayReasonCard.tsx      # Emoji + reason + severity badge
│   │   ├── TrainStatusBanner.tsx    # Top bar: train name, speed, status
│   │   └── StationTimeline.tsx      # Vertical route timeline with ETAs
│   ├── hooks/
│   │   ├── useTrainETA.ts           # REST fetch hook for ETA data
│   │   └── useTrainStream.ts        # WebSocket hook for live updates
│   ├── services/
│   │   └── api.ts                   # Axios/fetch base URL configuration
│   ├── types/
│   │   └── index.ts                 # TypeScript interfaces matching API schemas
│   ├── assets/
│   │   └── train_icon.png           # Custom train map marker
│   ├── app.json                     # Expo config
│   ├── package.json
│   └── tsconfig.json
│
├── Engineering_Implementation_Guide.md
├── Master_Build_Plan.md
├── Phase0_Research_Plan.md
├── LINKS.md
└── Prototype_Build_Plan.md          # ← THIS FILE
```

---

## 4. Module 1: Backend Data Layer

### Tech: SQLite (single file `sih_train.db`)
No Postgres/PostGIS for prototype. SQLite is zero-config, portable, and handles our 417K records effortlessly.

### Tables

```sql
-- All 417,080 intermediate stops across 5,208 trains
CREATE TABLE schedules (
    id INTEGER PRIMARY KEY,
    train_number TEXT NOT NULL,
    train_name TEXT,
    seq INTEGER,
    station_code TEXT NOT NULL,
    station_name TEXT,
    arrival TEXT,
    departure TEXT,
    day INTEGER DEFAULT 1,
    halt_min INTEGER DEFAULT 0
);
CREATE INDEX idx_train ON schedules(train_number);
CREATE INDEX idx_station ON schedules(station_code);

-- 8,539 stations with coordinates (from DataMeet trains.json features)
CREATE TABLE stations (
    station_code TEXT PRIMARY KEY,
    station_name TEXT,
    lat REAL,
    lon REAL,
    zone TEXT,
    state TEXT
);

-- Cached weather observations (hourly, TTL-managed)
CREATE TABLE weather_cache (
    station_code TEXT,
    timestamp TEXT,
    visibility_m REAL,
    precipitation_mm REAL,
    temperature_c REAL,
    wind_speed_kmh REAL,
    weather_code INTEGER,
    PRIMARY KEY (station_code, timestamp)
);
```

### Script: `server/scripts/01_setup_database.py`
**What it does:**
1. Downloads `schedules.json` and `trains.json` from DataMeet GitHub (if not cached locally).
2. Parses all 417,080 stop records → inserts into `schedules` table.
3. Extracts station coordinates from `trains.json` features → inserts into `stations` table.
4. Computes `halt_min` from arrival/departure time differences.
5. Creates indexes for fast train/station lookups.

**IMPORTANT:** The `trains.json` file from DataMeet is a GeoJSON FeatureCollection. Each feature has:
- `properties.from_station_code`, `properties.to_station_code` (origin/destination)
- `geometry.coordinates` (LineString of track coordinates — **NOT station lat/lon**)

Station lat/lon must be extracted from a separate station dataset. Use the Kaggle dataset [Indian Railway Stations & Routing Network](https://www.kaggle.com/datasets/mansiaggarwal88/indian-railway-stations-and-routing-network) (CSV with `~8,990 stations + lat/lon`) or scrape from the schedule stops with approximate geocoding.

**Fallback for station coordinates:** Use the Open-Meteo geocoding API (`https://geocoding-api.open-meteo.com/v1/search?name={station_name}&country=India`) for any stations missing lat/lon.

---

## 5. Module 2: Timetable & Station Ingestion

### Already Built: `src/ingestion/timetable_ingest.py`
This script is already functional. It downloads the master pan-India schedule database and can query any train number.

**For the prototype, refactor it to:**
1. Load from SQLite instead of re-parsing JSON every time.
2. Return a clean DataFrame with computed `section_distance_km` (requires station lat/lon for haversine distance calculation between consecutive stops).
3. Filter to only **scheduled stops** (where `halt_min > 0` or `arrival != departure`), skipping passing/non-stop block junctions. For the 12952 Mumbai Rajdhani, this reduces 202 raw records to ~8-10 actual stopping stations.

### Station Coordinate Loader: `server/ingestion/station_coords.py`
**What it does:**
1. Loads station lat/lon from Kaggle CSV or DataMeet.
2. For missing stations, uses haversine interpolation along the route (midpoint between known stations).
3. Populates the `stations` SQLite table.

---

## 6. Module 3: Weather Ingestion

### `server/ingestion/weather_client.py`

**What it does:**
- Takes a station's `(lat, lon)` and a date string.
- Queries `https://archive-api.open-meteo.com/v1/archive` for historical data (training).
- Queries `https://api.open-meteo.com/v1/forecast` for live/forecast data (inference).
- Returns hourly: `visibility_m`, `precipitation_mm`, `temperature_2m`, `wind_speed_10m`, `weather_code`.
- Caches results in `weather_cache` SQLite table with 1-hour freshness.
- **No API key required. 10,000 free calls/day.**

**Critical variables for our ML model:**
- `visibility_m`: Primary fog detection trigger. `< 200m` = Dense Fog = 30 km/h IR speed cap.
- `weather_code`: WMO codes `45/48` = Fog, `51-67` = Drizzle/Rain, `95-99` = Thunderstorm.
- `precipitation_mm`: Heavy rain (> 15 mm/h) triggers waterlogging speed restrictions.

---

## 7. Module 4: Telemetry Simulator

### `server/simulator/kinematic_engine.py`

**Purpose:** Generates realistic train movement telemetry (position, speed, delay) every 30 seconds along real track routes. Acts as the "synthetic RTIS" for the prototype since live GPS data is restricted.

**Core Physics:**
```
Effective Speed = min(Track MPS from timetable, Train Category Cap, Weather Fog Cap)

Speed Profile Along Section:
  Phase 1 — Acceleration (0.4 m/s² until cruise speed)
  Phase 2 — Cruise (at effective speed)
  Phase 3 — Deceleration (0.6 m/s² approaching next station)
```

**Stochastic Delay Injection:**
- **Signal halt:** `Poisson(λ=0.15)` probability per section, wait duration `Gamma(α=2, β=3)` ≈ 6 min mean.
- **Priority overtake hold:** If `train_priority ≥ 4`, 25% chance of loop siding wait `Gamma(α=2, β=3)`.
- **Dwell anomaly:** `LogNormal(μ=0, σ=0.5)` excess boarding time at major junctions.
- **Weather speed cap:** Applied based on real-time Open-Meteo visibility.

**Output per tick (every 30 seconds):**
```json
{
    "train_no": "12952",
    "timestamp": "2026-09-03T18:45:30+05:30",
    "lat": 26.845,
    "lon": 75.812,
    "speed_kmh": 128.4,
    "current_delay_min": 12.5,
    "current_station_idx": 3,
    "next_station_code": "KOTA",
    "status": "RUNNING"
}
```

**NTES Anchor Integration (P1):**
When NTES live data is available for a train, reset the simulator state to match the real NTES-reported delay at that station. This corrects simulation drift.

---

## 8. Module 5: Feature Pipeline

### `server/features/pipeline.py`

Assembles a flat feature vector (25 columns) for Model A inference from the current train state + weather + timetable metadata.

**Complete Feature List:**

| # | Feature Name | Type | Source | Description |
|:--|:--|:--|:--|:--|
| 1 | `current_delay_min` | float | Simulator/NTES | Delay at last known station |
| 2 | `lag_delay_1` | float | Computed | Delay at station k-1 |
| 3 | `lag_delay_2` | float | Computed | Delay at station k-2 |
| 4 | `lag_delay_5` | float | Computed | Delay at station k-5 |
| 5 | `delay_delta` | float | Computed | `current_delay - lag_delay_1` |
| 6 | `rolling_delay_trend` | float | Computed | Mean of last 3 delay deltas |
| 7 | `section_distance_km` | float | Timetable/GIS | Distance to next station |
| 8 | `track_capacity` | int | Static (default 2) | 1=single, 2=double track |
| 9 | `max_permitted_speed` | float | Timetable-derived | Avg speed = distance/scheduled_time |
| 10 | `train_priority` | int | Train number ranges | 1 (VB/Rajdhani) to 6 (Freight) |
| 11 | `sched_dwell_min` | float | Timetable | Scheduled halt at next station |
| 12 | `recovery_slack_min` | float | Timetable | Buffer time built into schedule |
| 13 | `trip_progress_ratio` | float | Computed | `current_seq / total_stops` |
| 14 | `is_origin_station` | int | Timetable | 1 if first stop, else 0 |
| 15 | `tod_sin` | float | Clock | `sin(2π × hour / 24)` |
| 16 | `tod_cos` | float | Clock | `cos(2π × hour / 24)` |
| 17 | `dow` | int | Calendar | Day of week (0=Mon, 6=Sun) |
| 18 | `visibility_m` | float | Open-Meteo | Horizontal visibility in meters |
| 19 | `precipitation_mm` | float | Open-Meteo | Hourly precipitation |
| 20 | `temperature_c` | float | Open-Meteo | 2m air temperature |
| 21 | `wind_speed_kmh` | float | Open-Meteo | 10m wind speed |
| 22 | `weather_code` | int | Open-Meteo | WMO weather code |
| 23 | `fog_severity_index` | float | Computed | `max(0, (1000 - vis) / 900)` |
| 24 | `upstream_train_delay` | float | Simulator | Delay of preceding train |
| 25 | `is_loco_reversal` | int | Timetable | 1 if `halt_min >= 20` at junction |

**Target Variable:** `delay_delta_next` = delay at next station minus delay at current station (in minutes).

---

## 9. Module 6: Model A — LightGBM Delay Predictor

### `server/models/lightgbm_model.py`

**Training Data Generation (`server/scripts/02_generate_training.py`):**
1. Select 20-50 high-frequency trains across diverse corridors (Rajdhani, Shatabdi, Mail/Express, Passenger).
2. Run the Kinematic Simulator for each train across 100 synthetic trips with randomized weather/congestion scenarios.
3. At each station stop, extract the full 25-feature vector + target `delay_delta_next`.
4. Save as `data/processed/training_data.parquet` (~50,000 to 200,000 rows).

**Three Models Trained (`server/scripts/03_train_model.py`):**

```python
# 1. Point Prediction (MAE-optimized)
lgb.LGBMRegressor(objective='regression_l1', n_estimators=600, num_leaves=31,
                  learning_rate=0.05, feature_fraction=0.85)

# 2. Lower Quantile (10th percentile)
lgb.LGBMRegressor(objective='quantile', alpha=0.10, n_estimators=600, ...)

# 3. Upper Quantile (90th percentile)
lgb.LGBMRegressor(objective='quantile', alpha=0.90, n_estimators=600, ...)
```

**Validation:** Temporal split (first 80% of trips = train, last 20% = validation). Never random split for time-series.

**Serialization:** Save all 3 models as `.pkl` files in `server/models/trained/`.

**Inference (< 1ms per prediction):**
```python
def predict(features_df):
    point = point_model.predict(features_df)
    q10 = q10_model.predict(features_df)
    q90 = q90_model.predict(features_df)
    return {"point": point, "q10": min(q10, point), "q90": max(q90, point)}
```

---

## 10. Module 7: CQR Confidence Interval Calibration

### `server/models/conformal_uq.py`

**Purpose:** Calibrates the raw LightGBM quantile outputs so the 90% prediction interval **actually** contains the true arrival 90% of the time.

**Algorithm (3 Steps):**
1. **Holdout calibration set:** Use 20% of validation data (separate from training & test).
2. **Compute non-conformity scores:** `E_i = max(q10_i - y_i, y_i - q90_i)` for each calibration row.
3. **Find correction margin:** `q_hat = quantile(E_scores, ceil((n+1) × 0.90) / n)`.
4. **Apply at inference:** `calibrated_lower = q10 - q_hat`, `calibrated_upper = q90 + q_hat`.

**Serialization:** Save `q_hat` value in `server/models/trained/cqr_params.json`.

---

## 11. Module 8: SHAP Delay Reason Engine

### `server/models/explainer.py`

**Purpose:** Translates LightGBM's internal feature contributions into plain-English delay reasons with emoji icons and severity badges.

**Runtime Flow:**
1. `shap.TreeExplainer(point_model)` — initialized once at server startup.
2. Per prediction: compute SHAP values for the single input row (< 5ms).
3. Sort features by positive SHAP contribution (features pushing delay higher).
4. Map top 3 to human-readable strings via lookup table.

**Complete Reason Mapping Table:**

| Feature | Condition | Reason Text |
|:--|:--|:--|
| `visibility_m` | < 200 | 🌫️ Dense Fog ({val}m) — Speed restricted to 30 km/h |
| `visibility_m` | 200–500 | 🌫️ Fog ({val}m) — Speed restricted to 60 km/h |
| `precipitation_mm` | > 15 | 🌧️ Heavy Rainfall ({val} mm/h) — Speed restriction active |
| `upstream_train_delay` | > 20 | 🚂 Preceding train delayed by {val}m — Block clearance wait |
| `track_capacity` | = 1 | 🛤️ Single-track section — Waiting for crossing train |
| `train_priority` | ≥ 5 | ⏸️ Held on loop for faster train to overtake |
| `is_loco_reversal` | = 1 | 🔄 Locomotive reversal / Engine shunting underway |
| `delay_delta` | > 5 | 📈 Compounding delay — Lost {val}m in previous section |
| `temperature_c` | > 45 | 🌡️ Rail thermal expansion risk — Speed restricted |
| `fog_severity_index` | > 0.8 | 🌫️ Severe fog conditions across corridor |
| (no major contributors) | — | 🟢 Normal operations — No major disruptions detected |

**Output format per prediction:**
```json
[
    {"reason": "🌫️ Dense Fog (120m) — Speed restricted to 30 km/h", "severity": "HIGH", "impact_min": 7.4},
    {"reason": "🚂 Preceding train delayed by 25m — Block clearance wait", "severity": "MEDIUM", "impact_min": 3.6}
]
```

---

## 12. Module 9: FastAPI REST + WebSocket Server

### `server/api/main.py`

**Server Setup:**
```python
app = FastAPI(title="RailPravah AI — Dynamic ETA Engine", version="1.0.0")
# CORS: allow all origins for mobile app access
# Startup: load LightGBM models + SHAP explainer + CQR params into memory
# Background: run simulator tick loop (every 5 seconds for demo)
```

### API Endpoints

**1. Train Search:**
```
GET /api/trains/search?q={query}
→ Returns: [{"train_no": "12952", "name": "Mumbai Rajdhani Express", "from": "NDLS", "to": "BCT"}]
Source: SQLite query on schedules table (LIKE match on train_number or train_name)
```

**2. Train Full Schedule:**
```
GET /api/train/{train_no}/schedule
→ Returns: Full stop sequence with station codes, names, arrival, departure, halt_min
Source: SQLite query filtered to stopping stations only (halt_min > 0 OR origin/destination)
```

**3. Train Live ETA (Core Endpoint):**
```
GET /api/train/{train_no}/eta
→ Returns:
{
    "train_no": "12952",
    "train_name": "Mumbai Rajdhani Express",
    "current_station": "MTJ",
    "next_station": "KOTA",
    "lat": 26.845,
    "lon": 75.812,
    "speed_kmh": 128.4,
    "current_delay_min": 12.5,
    "forecasted_delay_min": 18.2,
    "scheduled_arrival": "2026-09-03T21:35:00+05:30",
    "dynamic_eta": {
        "point_estimate": "2026-09-03T21:53:12+05:30",
        "confidence_90": {
            "lower": "2026-09-03T21:49:00+05:30",
            "upper": "2026-09-03T21:59:00+05:30"
        }
    },
    "delay_reasons": [
        {"reason": "🌫️ Dense Fog...", "severity": "HIGH", "impact_min": 7.4},
        {"reason": "🚂 Preceding train...", "severity": "MEDIUM", "impact_min": 3.6}
    ],
    "route_progress": [
        {"station": "NDLS", "status": "departed", "delay_min": 0},
        {"station": "MTJ", "status": "departed", "delay_min": 8},
        {"station": "KOTA", "status": "upcoming", "eta": "21:53"},
        {"station": "RTM", "status": "upcoming", "eta": "01:22"},
        ...
    ]
}
Source: Simulator state → Feature Pipeline → LightGBM → CQR → SHAP
```

**4. Station Board:**
```
GET /api/station/{station_code}/board
→ Returns: List of all active trains at/near this station with live ETAs
```

**5. WebSocket Live Stream:**
```
WS /api/train/{train_no}/stream
→ Pushes: Same ETA packet as endpoint 3, every 5 seconds
→ Client connects once, receives continuous updates without polling
```

---

## 13. Module 10: React Native Mobile App

### Tech Stack
| Component | Library | Why |
|:--|:--|:--|
| **Framework** | Expo SDK 52+ (React Native) | Managed workflow, fast dev, OTA updates |
| **Routing** | Expo Router (file-based) | Clean navigation, deep linking |
| **Maps** | `react-native-maps` (Google Maps / Apple Maps) | Native performance, polyline + marker support |
| **Styling** | NativeWind (Tailwind for RN) or StyleSheet | Rapid UI development |
| **HTTP** | Axios or fetch | REST API calls |
| **WebSocket** | Native `WebSocket` API | Live telemetry stream |
| **State** | Zustand or React Context | Lightweight global state |
| **Icons** | Lucide React Native or Expo Vector Icons | UI iconography |

### Screen 1: Home / Train Search (`app/(tabs)/index.tsx`)
- **Search bar** at top: autocomplete on train number or name.
- Query: `GET /api/trains/search?q={input}` as user types (debounced 300ms).
- Display result cards: `Train #12952 — Mumbai Rajdhani Express (NDLS → BCT)`.
- Tap → navigate to `app/train/[trainNo].tsx`.

### Screen 2: Train Detail (`app/train/[trainNo].tsx`)
This is the **hero screen** that showcases all core features. It has 4 sections stacked vertically:

**Section A: Status Banner (Top)**
- Train number, name, current status badge (`ON TIME` / `DELAYED BY 18m`).
- Current speed (km/h), current station name.
- Tracking mode indicator: 🟢 Live / 🟡 AI Estimated.

**Section B: Live Map (Middle)**
- Full-width map view showing:
  - **Track polyline:** Colored line connecting all stations on the route.
  - **Train marker:** Custom train icon at current `(lat, lon)` from simulator.
  - **Station markers:** Dots at each stopping station, colored by delay status:
    - 🟢 Green = On Time / Departed on time.
    - 🟡 Amber = Minor delay (5-15 min).
    - 🔴 Red = Heavy delay (> 15 min).
    - ⚪ Gray = Upcoming / Not yet reached.
  - Map auto-centers on train position, follows movement.
- **Track polyline data:** Server returns array of `[lat, lon]` pairs for the route. Use `Polyline` component from `react-native-maps`.

**Section C: Dynamic ETA Card**
- Large, bold arrival window: **"21:49 – 21:59"** with a horizontal confidence bar visualization.
- Point estimate highlighted: **"Most likely: 21:53"**.
- Badge: `90% AI Confidence` in blue pill.
- Scheduled arrival shown for comparison: `Scheduled: 21:35 (+18m delay)`.

**Section D: Delay Reason Cards**
- Vertical list of 2-3 cards, each containing:
  - Left: Emoji icon (🌫️ / 🚂 / 🛤️).
  - Center: Reason text in plain English.
  - Right: Severity badge (`HIGH` in red, `MEDIUM` in amber) + `+7.4m impact`.

**Section E: Route Timeline (Scrollable)**
- Vertical timeline showing all stopping stations:
  - Past stations: ✅ with actual delay (`+8m`).
  - Current position: 📍 highlighted.
  - Future stations: ⏳ with predicted ETA.

### Screen 3: Station Board (`app/(tabs)/station.tsx`)
- Station code/name search.
- Lists all trains passing through in next 4 hours with live ETAs.

### WebSocket Integration (`hooks/useTrainStream.ts`)
```typescript
export function useTrainStream(trainNo: string) {
    const [data, setData] = useState<ETAPacket | null>(null);
    
    useEffect(() => {
        const ws = new WebSocket(`ws://${API_BASE}/api/train/${trainNo}/stream`);
        ws.onmessage = (event) => setData(JSON.parse(event.data));
        return () => ws.close();
    }, [trainNo]);
    
    return data;
}
```

---

## 14. Data Contracts & API Schemas

### TypeScript Interfaces (Mobile App)

```typescript
// types/index.ts

export interface TrainSearchResult {
    train_no: string;
    name: string;
    from_station: string;
    to_station: string;
    type: string; // "Raj", "SF", "Mail", etc.
}

export interface ETAPacket {
    train_no: string;
    train_name: string;
    current_station: string;
    next_station: string;
    lat: number;
    lon: number;
    speed_kmh: number;
    current_delay_min: number;
    forecasted_delay_min: number;
    scheduled_arrival: string; // ISO 8601
    dynamic_eta: {
        point_estimate: string;
        confidence_90: {
            lower: string;
            upper: string;
        };
    };
    delay_reasons: DelayReason[];
    route_progress: RouteStop[];
}

export interface DelayReason {
    reason: string;     // "🌫️ Dense Fog (120m) — Speed restricted to 30 km/h"
    severity: "HIGH" | "MEDIUM" | "LOW";
    impact_min: number; // SHAP value in minutes
}

export interface RouteStop {
    station_code: string;
    station_name: string;
    status: "departed" | "current" | "upcoming";
    scheduled_time: string;
    delay_min?: number;
    eta?: string;
    lat: number;
    lon: number;
}
```

### Pydantic Models (FastAPI Backend)

```python
# server/api/schemas.py
from pydantic import BaseModel
from typing import List, Optional

class ConfidenceInterval(BaseModel):
    lower: str
    upper: str

class DynamicETA(BaseModel):
    point_estimate: str
    confidence_90: ConfidenceInterval

class DelayReason(BaseModel):
    reason: str
    severity: str  # "HIGH", "MEDIUM", "LOW"
    impact_min: float

class RouteStop(BaseModel):
    station_code: str
    station_name: str
    status: str  # "departed", "current", "upcoming"
    scheduled_time: str
    delay_min: Optional[float] = None
    eta: Optional[str] = None
    lat: float
    lon: float

class ETAResponse(BaseModel):
    train_no: str
    train_name: str
    current_station: str
    next_station: str
    lat: float
    lon: float
    speed_kmh: float
    current_delay_min: float
    forecasted_delay_min: float
    scheduled_arrival: str
    dynamic_eta: DynamicETA
    delay_reasons: List[DelayReason]
    route_progress: List[RouteStop]
```

---

## 15. Build Order & Task Parallelization

### Phase 1 — Backend Foundation (Day 1-2)

| Task | Module | Assignee | Depends On |
|:--|:--|:--|:--|
| 1.1 Setup SQLite DB + ingest schedules + stations | Module 1 & 2 | Backend Dev | Nothing |
| 1.2 Build weather client (Open-Meteo) | Module 3 | Backend Dev | Station coords |
| 1.3 Build kinematic simulator | Module 4 | ML Dev | Timetable data |
| 1.4 Setup Expo React Native project scaffold | Module 10 | Frontend Dev | Nothing |

### Phase 2 — ML Pipeline (Day 2-3)

| Task | Module | Assignee | Depends On |
|:--|:--|:--|:--|
| 2.1 Build feature pipeline (25 features) | Module 5 | ML Dev | Simulator + Weather |
| 2.2 Generate training data (50K+ rows via simulator) | Module 6 | ML Dev | Feature pipeline |
| 2.3 Train LightGBM (point + q10 + q90) | Module 6 | ML Dev | Training data |
| 2.4 Calibrate CQR (compute q_hat) | Module 7 | ML Dev | Trained models |
| 2.5 Build SHAP explainer + reason mapping | Module 8 | ML Dev | Trained point model |
| 2.6 Build Train Search UI + navigation | Module 10 | Frontend Dev | Nothing |

### Phase 3 — API + Mobile Integration (Day 3-4)

| Task | Module | Assignee | Depends On |
|:--|:--|:--|:--|
| 3.1 Build FastAPI endpoints (search, schedule, eta) | Module 9 | Backend Dev | All ML models |
| 3.2 Build WebSocket live stream | Module 9 | Backend Dev | Simulator |
| 3.3 Build Live Map component | Module 10 | Frontend Dev | API endpoints |
| 3.4 Build ETA Card component | Module 10 | Frontend Dev | API endpoints |
| 3.5 Build Delay Reason Cards | Module 10 | Frontend Dev | API endpoints |
| 3.6 Build Route Timeline | Module 10 | Frontend Dev | API endpoints |

### Phase 4 — Polish & Demo Prep (Day 4-5)

| Task | Module | Assignee | Depends On |
|:--|:--|:--|:--|
| 4.1 WebSocket integration (auto-updating ETA) | Module 10 | Frontend Dev | WebSocket API |
| 4.2 Station Board screen | Module 10 | Frontend Dev | Station API |
| 4.3 Error handling, loading states, edge cases | All | All | Everything |
| 4.4 Pre-load demo corridor data (Delhi-Mumbai) | Backend | Backend Dev | Everything |
| 4.5 Rehearse demo script | — | All | Everything |

---

## 16. Demo Script for Judges

### Step 1: Train Search (10 seconds)
> "Let me search for Train 12952 — the Mumbai Rajdhani Express."
- Type `12952` in search bar → tap result card.

### Step 2: Live Map (15 seconds)
> "Here you can see the train moving live on its actual track between Mathura and Kota. It's currently doing 128 km/h."
- Show train icon moving along track polyline.
- Zoom in/out to show station markers.

### Step 3: AI ETA Prediction (20 seconds)
> "Instead of a single static timestamp that keeps changing, we provide a statistically guaranteed 90% confidence arrival window. The train will arrive at Kota between 21:49 and 21:59. This interval is calibrated using Conformalized Quantile Regression — a mathematical framework that guarantees this window contains the true arrival at least 90% of the time."
- Point to the ETA card with lower/upper bounds.

### Step 4: Explainable Delay Reasons (20 seconds)
> "Now the key question every passenger asks: WHY is my train late? Our SHAP-based explainability engine analyzes 25 real-time features and tells you in plain language. Right now, the top cause is Dense Fog at 120 meters visibility, which triggered the Indian Railways 30 km/h safety speed restriction. The second cause is a preceding freight train blocking the next block section."
- Show the delay reason cards with emoji icons and severity badges.

### Step 5: Route Timeline (10 seconds)
> "And here's the full journey timeline — past stations show actual delays, and future stations show our AI-predicted ETAs."
- Scroll through the route timeline.

### Step 6: Architecture Pitch (15 seconds)
> "Under the hood, this runs a LightGBM gradient-boosted tree model trained on 25 features including real-time Open-Meteo weather data, autoregressive delay lags, track topology, and Indian Railways operational rules. The full production version adds a Spatio-Temporal Graph Neural Network for network-wide delay cascade detection and an offline In-Coach Validator using smartphone sensors for cellular dead zones."

**Total Demo Time: ~90 seconds.**
