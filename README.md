# 🚆 RailPravah AI (रेल प्रवाह)
### Intelligent Indian Railways Dynamic ETA Forecasting & Explainable Delay Platform
> **Smart India Hackathon (SIH) Working Prototype / MVP**

---

## 🌟 Highlights & Core USPs
1. **Dynamic 90% Statistical Arrival Windows (CQR):** Replaces false single-point timestamps with mathematically guaranteed arrival intervals using **Conformalized Quantile Regression**.
2. **Causal Delay Diagnosis (Tree-SHAP):** Answers *"Why is my train delayed?"* in plain English with emoji tags (fog restrictions, single-track meets, preceding delayed trains, engine changeovers).
3. **Kinematic Telemetry & Live Track Map:** Smooth 30-second continuous train speed and position updates along real track geometry.
4. **React Native Mobile App:** Built exclusively for mobile (iOS & Android) with search, live map tracking, confidence cards, and station departure boards.
5. **Pan-India Coverage:** Ingested 5,208 trains and 8,990 stations into a high-performance SQLite database.

---

## 🏗️ Architecture

```
[Pan-India Schedules (SQLite)] + [Open-Meteo Weather API] + [Kinematic Simulator]
                               │
                               ▼
                   [25-Feature Vector Pipeline]
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │ Model A: LightGBM (Point, q10, q90 Quantiles)│
        └──────────────────────┬───────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
  [Model C: Conformal UQ (90%)]          [Tree-SHAP Explainer]
  (Calibrated [14:32 – 14:47])           ("🌫️ Dense Fog 110m")
            │                                     │
            └──────────────────┬──────────────────┘
                               ▼
                  [FastAPI REST & WebSocket Server]
                               │
                               ▼
                 [React Native Mobile App (Expo)]
```

---

## 🚀 Quickstart Guide

### 1. Start the Backend Server (Terminal 1)
```bash
# Activate virtual environment
source .venv/bin/activate

# Run FastAPI backend with uvicorn (port 8000)
python3 -m uvicorn server.api.main:app --host 0.0.0.0 --port 8000 --reload
```
* Interactive API Documentation: `http://localhost:8000/docs`
* Health Check: `http://localhost:8000/api/health`

### 2. Start the React Native Mobile App (Terminal 2)
```bash
cd mobile

# Start Expo development server
npx expo start
```
* Press `a` for Android Emulator
* Press `i` for iOS Simulator
* Press `w` for Web Preview
* Scan QR code with the **Expo Go** app on your phone to run on physical device!

### 3. Run Automated Integration Test Suite
```bash
source .venv/bin/activate
python3 server/scripts/test_integration.py
```

---

## 📱 Mobile App Screens

### Screen 1: Live Train Tracker (`TrainDetailScreen`)
* **Autocomplete Train Search:** Search any of the 5,208 trains (e.g. `12952`, `22436`, `12301`, `12004`).
* **Live Status Banner:** Live speed gauge, current/next station, and telemetry status.
* **AI Predicted Arrival Window:** Large `14:32 – 14:47` interval bar with 90% CQR confidence guarantee.
* **Why Is My Train Late? Cards:** SHAP-derived causal root factors with severity badges.
* **Live Railway Track Map:** Track geometry with moving train marker and station milestones.
* **Route Journey Timeline:** Full vertical stop sequence with past delays and upcoming ETAs.

### Screen 2: Station Board (`StationBoardScreen`)
* Quick station switchers (`NDLS`, `KOTA`, `CNB`, `BCT`, `HWH`) or search any of India's 8,990 station codes.
* Displays scheduled arrival, predicted AI ETA, and delay tags (`🟢 On Time`, `🟡 Delayed`, `🔴 Heavy Delay`).

---

## 📊 Evaluation & Verification Metrics
* **Point MAE:** `1.10 minutes` on test validation sets.
* **Point RMSE:** `2.51 minutes`.
* **Empirical 90% Test Coverage:** `90.0%` (strictly calibrated via CQR).
* **Average Confidence Interval Width:** `4.8 minutes`.
* **API Latency:** `< 5ms` per prediction.

---

## 📂 Codebase Directory Layout
```
sih-train/
├── server/                          # Python Backend (FastAPI + ML Engine)
│   ├── config.py                    # Paths, operational thresholds, priorities
│   ├── database.py                  # SQLite schema & query helpers
│   ├── ingestion/
│   │   ├── station_coords.py        # 8,990 station lat/lon parser
│   │   ├── timetable_loader.py      # 417,080 stop records loader
│   │   └── weather_client.py        # Open-Meteo real-time weather + SQLite cache
│   ├── simulator/
│   │   └── kinematic_engine.py      # Physics speed profile + weather caps
│   ├── features/
│   │   └── pipeline.py              # 25-feature vector assembler
│   ├── models/
│   │   ├── lightgbm_model.py        # Model A: Point + q10 + q90 estimators
│   │   ├── conformal_uq.py          # CQR 90% interval calibrator
│   │   ├── explainer.py             # Tree-SHAP plain-English translator
│   │   └── trained/                 # Serialized model weights (.pkl, .json)
│   ├── api/
│   │   ├── main.py                  # FastAPI application entrypoint
│   │   ├── schemas.py               # Pydantic data contracts
│   │   ├── routes_eta.py            # Search, Schedule, ETA, Station Board
│   │   └── routes_ws.py             # WebSocket 3-sec live telemetry streamer
│   └── scripts/
│       ├── 01_setup_database.py     # Database population pipeline
│       ├── 02_generate_training.py  # 52K multi-scenario synthetic dataset generator
│       ├── 03_train_model.py        # LightGBM + CQR training & verification
│       └── test_integration.py      # End-to-end automated test suite
│
├── mobile/                          # React Native Mobile App (Expo)
│   ├── components/
│   │   ├── TrainSearchBar.tsx       # Autocomplete search
│   │   ├── TrainStatusBanner.tsx    # Speed gauge & delay status
│   │   ├── ETACard.tsx              # 90% CQR confidence arrival interval
│   │   ├── DelayReasonCard.tsx      # Emoji-tagged SHAP reason cards
│   │   ├── LiveTrackMap.tsx         # Track geometry & live train marker
│   │   └── StationTimeline.tsx      # Vertical route progress milestones
│   ├── screens/
│   │   ├── TrainDetailScreen.tsx    # Hero live tracker screen
│   │   └── StationBoardScreen.tsx   # Station departures & arrivals
│   ├── hooks/
│   │   └── useTrainStream.ts        # Real-time WebSocket hook
│   ├── services/
│   │   └── api.ts                   # Backend HTTP/WS connector
│   ├── types/
│   │   └── index.ts                 # TypeScript interfaces
│   └── App.tsx                      # Root navigation & tab bar
```
