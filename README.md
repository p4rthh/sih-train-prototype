# RailPravah AI (रेल प्रवाह)
Dynamic train arrival forecasting and explainable delay engine for Indian Railways.

---

## Features
- **Statistical Arrival Intervals (CQR):** Replaces static single-point estimates with calibrated arrival windows using Conformalized Quantile Regression.
- **Delay Root-Cause Attribution:** Uses Tree-SHAP to extract operational, weather, and congestion drivers (dense fog, single-track meets, preceding delayed trains, engine reversals).
- **Kinematic Simulation & NTES Anchoring:** Real-time continuous speed and coordinate tracking along track geometry with live NTES status fallback.
- **Station Departures & Route Search:** Pan-India express train route search, station board, and 10-digit PNR tracking.
- **React Native Mobile Frontend:** Dedicated mobile interface for Android and iOS.

---

## Architecture

```
[Pan-India Schedules (SQLite)] + [Open-Meteo Weather] + [Kinematic Simulator / NTES]
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
   [Conformal UQ (90%)]                  [Tree-SHAP Explainer]
   (Calibrated [14:32 – 14:47])          ("Dense Fog 110m")
             │                                     │
             └──────────────────┬──────────────────┘
                                ▼
                   [FastAPI REST & WebSocket Server]
                                │
                                ▼
                  [React Native Mobile App (Expo)]
```

---

## Quickstart

### 1. Start Backend Server
```bash
source .venv/bin/activate
python3 -m uvicorn server.api.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/health`

### 2. Start React Native App
```bash
cd mobile
npx expo start
```
- Press `a` for Android Emulator
- Press `i` for iOS Simulator
- Press `w` for Web Preview
- Scan QR code using the Expo Go app on a physical device.

### 3. Run Integration Tests
```bash
source .venv/bin/activate
python3 server/scripts/test_integration.py
```

---

## Project Structure

```
.
├── server/
│   ├── config.py
│   ├── database.py
│   ├── ingestion/
│   │   ├── ntes_anchor.py
│   │   ├── pnr_resolver.py
│   │   ├── station_coords.py
│   │   ├── timetable_loader.py
│   │   └── weather_client.py
│   ├── simulator/
│   │   └── kinematic_engine.py
│   ├── features/
│   │   └── pipeline.py
│   ├── models/
│   │   ├── lightgbm_model.py
│   │   ├── conformal_uq.py
│   │   ├── explainer.py
│   │   └── trained/
│   ├── api/
│   │   ├── main.py
│   │   ├── schemas.py
│   │   ├── routes_eta.py
│   │   └── routes_ws.py
│   └── scripts/
│       ├── 01_setup_database.py
│       ├── 02_generate_training.py
│       ├── 03_train_model.py
│       └── test_integration.py
├── mobile/
│   ├── components/
│   ├── screens/
│   ├── services/
│   ├── types/
│   └── App.tsx
└── README.md
```
