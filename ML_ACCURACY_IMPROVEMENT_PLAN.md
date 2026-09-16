# NavaRail ML Accuracy Improvement Plan

> **Purpose:** This document is a complete, self-contained engineering spec for agents (Gemini Flash, Claude Sonnet, etc.) to execute. It covers every model in the stack, every weakness found, and every improvement to implement — ordered by priority and impact on ETA accuracy.

---

## Table of Contents

1. [Current Architecture Audit](#1-current-architecture-audit)
2. [Critical Problems Found](#2-critical-problems-found)
3. [Phase 1: Training Data Overhaul](#3-phase-1-training-data-overhaul)
4. [Phase 2: Feature Engineering v2](#4-phase-2-feature-engineering-v2)
5. [Phase 3: Model A — LightGBM Tuning](#5-phase-3-model-a--lightgbm-tuning)
6. [Phase 4: Model B — ST-GCN Rebuild](#6-phase-4-model-b--stgcn-rebuild)
7. [Phase 5: Model C — Stacking Ensemble v2](#7-phase-5-model-c--stacking-ensemble-v2)
8. [Phase 6: Model D — Conformal Calibration v2](#8-phase-6-model-d--conformal-calibration-v2)
9. [Phase 7: Recovery Engine v2 — Historical Behavioral Learning](#9-phase-7-recovery-engine-v2--historical-behavioral-learning)
10. [Phase 8: Live NTES Feedback Loop](#10-phase-8-live-ntes-feedback-loop)
11. [Phase 9: Inference Pipeline Fixes](#11-phase-9-inference-pipeline-fixes)
12. [Execution Order & Dependencies](#12-execution-order--dependencies)
13. [File Map](#13-file-map)

---

## 1. Current Architecture Audit

### Models in Stack

| Model | File | Type | Input | Output | Status |
|-------|------|------|-------|--------|--------|
| **Model A: LightGBM** | `server/models/lightgbm_model.py` | Gradient boosted trees (L1 loss + quantile) | 29 tabular features | `delay_delta_next` (point + q10 + q90) | Trained, 43,905 samples |
| **Model B: ST-GCN** | `server/models/stgcn_model.py` | Spatio-Temporal Graph Convolutional Network | `(B, N, 4, 4)` graph tensor + Laplacian | Per-node delay delta | Trained, ~1000 synthetic samples |
| **Model C: Stacking Ensemble** | `server/models/ensemble.py` | Ridge regression meta-learner | LightGBM pred + STGCN pred | Blended `delay_delta` | Trained: w_lgb=0.637, w_stgcn=0.363 |
| **Model D: CQR Calibrator** | `server/models/conformal_uq.py` | Conformal Quantile Regression | q10/q90 residuals | Calibrated 90% CI margin | q_hat = 0.795 |

### Supporting Engines

| Component | File | Role |
|-----------|------|------|
| **Recovery Engine** | `server/models/recovery_engine.py` | Hardcoded historical catch-up trajectories |
| **Feature Pipeline** | `server/features/pipeline.py` | 29-feature extraction from state+weather |
| **SHAP Explainer** | `server/models/explainer.py` | TreeExplainer for delay reason attribution |
| **Training Data Generator** | `server/scripts/02_generate_training.py` | Synthetic data from kinematic simulator |
| **Kinematic Engine** | `server/simulator/kinematic_engine.py` | Physics-based train position simulator |

### Current Trained Model Artifacts

```
server/models/trained/
├── lgb_point.pkl      (1.1 MB)  — L1 regression point model
├── lgb_q10.pkl        (1.2 MB)  — 10th quantile model
├── lgb_q90.pkl        (1.2 MB)  — 90th quantile model
├── stgcn.pt           (22 KB)   — PyTorch ST-GCN weights
├── ensemble_weights.json         — {w_lgb: 0.637, w_stgcn: 0.363, bias: 0.22}
└── cqr_params.json               — {coverage: 0.90, q_hat: 0.795}
```

### Training Data Profile

```
Shape: (43,905 rows x 30 columns)
Target: delay_delta_next (min: -5.0, max: 53.84, mean: 2.62, std: 4.20)
- 48% of samples have target = 0.0 (no delay change)
- recovery_slack_min is constant at 4.0 (never varies!)
- is_loco_reversal is always 0 (never triggered)
- current_delay_min reaches 3,730 min (62 hours!) — clear data bug
- Only 40 random trains sampled, 15 trips each
- Weather is scenario-based synthetic, NOT real station weather
```

---

## 2. Critical Problems Found

> **CAUTION:** These are the root causes of inaccurate ETA predictions. Each one MUST be fixed.

### P0 — Showstopper Issues

1. **Training data is 100% synthetic.** The `delay_delta_next` target is computed from kinematic equations (`actual_time - nominal_time`), NOT from real NTES delay logs. The model has never seen what an actual Indian Railways delay progression looks like.

2. **Runaway cumulative delay bug.** In `02_generate_training.py:138`, delays compound without bound: `sim.current_delay_min = max(0.0, sim.current_delay_min + delta)`. After 80+ stops, delays reach 3,730 minutes. This pollutes the training distribution with unrealistic cascading delays.

3. **`recovery_slack_min` is hardcoded to 4.0.** In `pipeline.py:95`, `state.get("recovery_slack_min", 4.0)` always falls through to the default because the simulator state dict never sets this key. The feature carries zero information.

4. **`is_loco_reversal` is always 0.** Same reason — the simulator never sets it. The feature is dead.

5. **ST-GCN is trained on purely synthetic graph data** with a fabricated formula: `y = (delay * 0.08) + (fog * 5.0) + (precip * 3.5)`. This is a hand-coded linear function, NOT learned delay propagation patterns. The ST-GCN is essentially learning to memorize a linear equation.

6. **The ensemble fitting uses a blended target `y_target = 0.60 * y_val_tab + 0.40 * y_val_g`** in `04_train_stgcn.py:140`. This mixes tabular validation labels with graph synthetic labels at a fixed ratio. The meta-learner is fitting to a manually constructed pseudo-target, not ground truth.

### P1 — High Impact Issues

7. **Only 40 trains in training.** Indian Railways has 13,198+ daily services. The model has seen <0.3% of the network diversity.

8. **Weather features are scenario-sampled, not real.** Training uses `random.uniform(80, 450)` for fog visibility instead of actual Open-Meteo data for the station/date of each sample. The model learns fake weather-delay correlations.

9. **No train-specific behavioral encoding.** The model has no way to learn that train 12095 specifically recovers delay between KOTA and RTM overnight. All recovery patterns are in the hardcoded `recovery_engine.py`, NOT in the ML models.

10. **No scheduled timetable slack features.** The `recovery_slack_min` feature (always 4.0) should reflect the ACTUAL difference between scheduled transit time and physical minimum time for each section.

11. **No section-specific features.** Track capacity, electrification status, single/double track, junction congestion — all are missing or defaulted.

12. **Hop-distance weighting in ensemble is rule-based.** The `predict_delta` in `ensemble.py` uses hard if/else hop thresholds instead of learned hop-adaptive blending.

### P2 — Medium Impact Issues

13. **No cross-validation.** Training uses a single 70/15/15 split on a fixed random seed. No k-fold, no stratification by train type or weather scenario.

14. **LightGBM uses only 400 trees.** For 43K samples with 29 features, this is conservative. The learning rate of 0.05 with 31 leaves is also suboptimal for this dataset size.

15. **ST-GCN graph is padded/sliced to exactly 8 nodes.** Routes with 25+ stops lose spatial resolution. Routes with 5 stops have 3 duplicate padding nodes.

16. **No time-series autoregressive structure.** The model predicts `delay_delta_next` from a snapshot. It does not condition on the full trajectory of delay changes across the journey.

---

## 3. Phase 1: Training Data Overhaul

> **Goal:** Replace synthetic training data with data grounded in real NTES delay logs.

### 3.1 Live NTES Data Collection Script

Create `server/scripts/collect_ntes_training_data.py`:

```python
"""
Continuously polls NTES live_status for a set of trains.
Logs per-station delay observations to an SQLite table.
Run as a background cron: every 5 minutes, poll 50 trains.
After 2-4 weeks, produces 500K+ real delay transition records.
"""
```

**Schema for new `delay_observations` table:**

```sql
CREATE TABLE delay_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    train_number TEXT NOT NULL,
    train_name TEXT,
    run_date TEXT NOT NULL,          -- DD-Mon-YYYY
    station_code TEXT NOT NULL,
    station_seq INTEGER,
    scheduled_arrival TEXT,
    actual_arrival TEXT,             -- from NTES
    delay_min REAL,                  -- from NTES LDEL field
    prev_station_code TEXT,
    prev_delay_min REAL,
    delay_delta REAL,               -- (delay_min - prev_delay_min) = the TARGET
    timestamp_utc TEXT,
    weather_visibility_m REAL,      -- fetched from Open-Meteo at collection time
    weather_precip_mm REAL,
    weather_temp_c REAL,
    weather_fog_index REAL,
    train_priority INTEGER,
    is_overnight INTEGER,
    section_distance_km REAL,
    day_of_week INTEGER,
    hour_of_day REAL
);
```

**Collection logic:**

1. Select top 200 trains by traffic volume (Rajdhanis, Shatabdis, Durontos, Superfast, Mail/Express).
2. Every 5 minutes, call `ntes_client.live_status(train_no, today)` for each active train.
3. Parse `LDEL` (delay at last station), `LSTN` (last station code), compute `delay_delta` from previous observation.
4. Simultaneously call `weather_client.get_weather(station_code, lat, lon)` for real environmental conditions.
5. Store to `delay_observations` table.
6. After 14+ days, export to `data/processed/real_training_data.parquet`.

### 3.2 Improved Synthetic Data Generator

Until real data accumulates (minimum 2 weeks), improve `02_generate_training.py`:

**Changes required:**

```
File: server/scripts/02_generate_training.py
```

1. **Increase train coverage to 200+ trains** (change `LIMIT 40` to `LIMIT 200`).
2. **Cap cumulative delay at 120 minutes.** Add `sim.current_delay_min = min(120.0, ...)` at line 138.
3. **Compute real `recovery_slack_min`** for each section using scheduled arrival/departure times instead of hardcoding 4.0.
4. **Compute real `section_distance_km`** from station coordinates (haversine) instead of using `(tot_stops - stop_idx) * 22.0`.
5. **Set `is_loco_reversal` correctly** by checking if `halt_min >= 20` for the current stop (crew change / loco reversal).
6. **Fetch real historical weather** from Open-Meteo Archive API for the station lat/lon and a random date in the past 6 months, instead of using random scenario buckets.
7. **Generate 30 trips per train** instead of 15 (doubles dataset to ~130K samples).
8. **Add train-specific behavioral features** by embedding `train_number` hash or categorical encoding.
9. **Add day-type variation** — weekday vs weekend vs holiday delays differ significantly.

### 3.3 Target Variable Redesign

Current target: `delay_delta_next` = kinematic time excess.

**Better target:** `delay_at_next_station` = the absolute delay (in minutes behind schedule) at the next station. This is what NTES actually reports and what passengers care about.

However, since `delay_delta` (the change in delay between consecutive stations) is what the model needs to forecast for multi-hop trajectory prediction, keep `delay_delta_next` but compute it as:

```python
delay_delta_next = delay_at_station[i+1] - delay_at_station[i]
```

This is the same semantics but grounded in real delay readings, not kinematic equations.

---

## 4. Phase 2: Feature Engineering v2

> **Goal:** Expand the 29-feature vector to ~42 features with high-signal additions.

### 4.1 New Features to Add

```
File: server/features/pipeline.py
Update FEATURE_NAMES list and extract_features() method.
```

| # | Feature Name | Type | Source | Rationale |
|---|-------------|------|--------|-----------|
| 30 | `section_slack_min` | float | Computed from schedule times | Real timetable buffer available for recovery. Currently hardcoded to 4.0. |
| 31 | `cumulative_delay_min` | float | State | Total delay accumulated so far (capped at 120). Distinct from current_delay_min. |
| 32 | `stops_remaining` | int | State | Absolute stops to destination. More informative than progress_ratio alone. |
| 33 | `train_number_hash` | int | Hash | `hash(train_no) % 256`. Allows model to learn train-specific behavior. |
| 34 | `section_scheduled_transit_min` | float | Schedule | Scheduled time between prev and next station. |
| 35 | `is_junction_station` | int | Station DB | Whether current station is a major junction (multiple routes converge). |
| 36 | `zone_id` | int | Station DB | Railway zone encoded as integer (NR=0, WR=1, etc.). |
| 37 | `is_terminal_approach` | int | State | 1 if within last 3 stops of destination. |
| 38 | `delay_acceleration` | float | Delay history | Second derivative: how fast delay is increasing/decreasing. |
| 39 | `max_delay_so_far` | float | Delay history | Peak delay encountered on this trip. Trains that peaked at 40min behave differently than those that peaked at 5min. |
| 40 | `is_holiday_or_festival` | int | Date lookup | Indian public holiday / festival period flag. |
| 41 | `is_monsoon_season` | int | Date lookup | July-September flag for systematic weather-related delays. |
| 42 | `avg_hist_delay_at_this_station` | float | Historical profiles | Average delay observed at this specific station for this train from past data. |

### 4.2 Fix Broken Features

1. **`recovery_slack_min`** — Compute from schedule:
   ```python
   prev_dep = state.get("prev_departure_time")
   curr_arr = state.get("scheduled_arrival_time")
   if prev_dep and curr_arr:
       scheduled_transit = time_diff_minutes(prev_dep, curr_arr)
       physical_min = (section_km / max_speed) * 60 + 1.5
       recovery_slack_min = max(0, scheduled_transit - physical_min)
   ```

2. **`is_loco_reversal`** — Check:
   ```python
   is_loco_reversal = 1 if (halt_min >= 20 or station_code in KNOWN_REVERSAL_STATIONS) else 0
   ```
   Known reversal stations: `["ALD", "PRYJ", "DDU", "MGS", "BPL", "ET", "NGP", "VSKP"]`

3. **`track_capacity`** — Currently always defaults to 2. Should be looked up from a track section database or at minimum encoded for known single-track sections.

---

## 5. Phase 3: Model A — LightGBM Tuning

> **Goal:** Improve point prediction accuracy and quantile calibration.

```
File: server/models/lightgbm_model.py
File: server/scripts/03_train_model.py
```

### 5.1 Hyperparameter Updates

Replace the current `base_params`:

```python
# CURRENT (suboptimal for 43K samples, will be 130K+ after data overhaul)
base_params = {
    "n_estimators": 400,
    "learning_rate": 0.05,
    "num_leaves": 31,
    "feature_fraction": 0.85,
    "bagging_fraction": 0.8,
    "bagging_freq": 1,
    "random_state": 42,
    "verbose": -1
}

# IMPROVED
base_params = {
    "n_estimators": 1200,
    "learning_rate": 0.03,
    "num_leaves": 63,
    "max_depth": 8,
    "min_child_samples": 25,
    "feature_fraction": 0.80,
    "bagging_fraction": 0.75,
    "bagging_freq": 3,
    "reg_alpha": 0.1,          # L1 regularization
    "reg_lambda": 1.0,         # L2 regularization
    "random_state": 42,
    "verbose": -1,
    "early_stopping_rounds": 50
}
```

### 5.2 Optuna Hyperparameter Search

Add `server/scripts/03a_tune_lightgbm.py`:

```python
"""
Uses Optuna to find optimal LightGBM hyperparameters via 5-fold CV.

Search space:
  n_estimators: [400, 2000]
  learning_rate: [0.01, 0.1]
  num_leaves: [15, 127]
  max_depth: [4, 12]
  min_child_samples: [10, 100]
  feature_fraction: [0.5, 1.0]
  bagging_fraction: [0.5, 1.0]
  reg_alpha: [1e-3, 10.0]
  reg_lambda: [1e-3, 10.0]

Objective: minimize 5-fold CV MAE on delay_delta_next.
n_trials: 100
"""
```

### 5.3 Cross-Validation

Replace the current single split with stratified k-fold:

```python
# In 03_train_model.py
from sklearn.model_selection import GroupKFold

# Group by train_number to prevent data leakage
# (all stops from one trip should be in same fold)
groups = df["train_number_hash"]  # or trip_id
gkf = GroupKFold(n_splits=5)

# Track OOF predictions for CQR calibration
oof_point = np.zeros(len(df))
oof_q10 = np.zeros(len(df))
oof_q90 = np.zeros(len(df))

for fold, (train_idx, val_idx) in enumerate(gkf.split(X, y, groups)):
    # train and accumulate OOF predictions
    ...
```

### 5.4 Huber Loss Alternative

For the point model, consider Huber loss instead of L1:

```python
self.point_model = lgb.LGBMRegressor(
    **base_params,
    objective="huber",
    huber_delta=5.0  # less sensitive to outliers than MSE, smoother than L1
)
```

### 5.5 Sample Weighting

Give more weight to samples where the train is actually delayed:

```python
sample_weights = np.where(y_train.abs() > 3.0, 2.0, 1.0)
sample_weights = np.where(y_train.abs() > 10.0, 3.0, sample_weights)
model.fit(X_train, y_train, sample_weight=sample_weights, ...)
```

---

## 6. Phase 4: Model B — ST-GCN Rebuild

> **Goal:** Transform ST-GCN from a toy model into a real delay-propagation learner.

```
File: server/models/stgcn_model.py
File: server/scripts/04_train_stgcn.py
```

### 6.1 Problems with Current ST-GCN

1. **Only 4 node features:** `[delay/60, fog_index, precip/20, is_current]`
2. **Only 4 timesteps** with fabricated temporal lags
3. **Fixed 8-node graphs** (pad/slice all routes to 8)
4. **1000 synthetic training samples** with hand-coded target formula
5. **25 epochs, MSE loss, lr=0.008** — too few epochs, too high LR for graph learning
6. **Laplacian is averaged across all corridors** at inference — loses route specificity

### 6.2 Redesigned Architecture

```python
class RailwaySTGCNv2(nn.Module):
    """
    Two stacked ST-GCN blocks with skip connections.
    Flexible node count (no more padding to 8).
    Enhanced node features.
    """
    def __init__(self, in_features=8, hidden_dim=64, num_timesteps=6):
        super().__init__()
        self.block1 = STGCNBlock(in_features, hidden_dim, hidden_dim, num_nodes=None)
        self.block2 = STGCNBlock(hidden_dim, hidden_dim, hidden_dim, num_nodes=None)
        self.readout = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, 1)
        )
    
    def forward(self, x, laplacian):
        # x: (B, N, F, T)
        h = self.block1(x, laplacian)   # temporal dim shrinks by 2
        h = self.block2(h, laplacian)   # temporal dim shrinks by 2 more
        # Pool over remaining temporal dim
        h = h.mean(dim=-1)  # (B, N, hidden_dim)
        return self.readout(h).squeeze(-1)  # (B, N)
```

### 6.3 Enhanced Node Features (8 per node, 6 timesteps)

For each node (station) at each timestep:

| Feature | Description |
|---------|-------------|
| `delay_normalized` | Delay at this station / 60.0 (minutes to hour scale) |
| `delay_delta` | Change in delay from previous station |
| `fog_severity` | Fog index (0-1) at this station |
| `precipitation` | Rainfall mm/h normalized to [0,1] |
| `section_distance` | Distance from previous station / 200 (normalized) |
| `scheduled_slack` | Timetable slack (minutes) / 30 (normalized) |
| `is_current_or_past` | 1.0 if already passed, 0.5 if current, 0.0 if upcoming |
| `train_priority` | Priority tier / 6.0 (normalized) |

### 6.4 Proper Training Protocol

```python
# In 04_train_stgcn.py

# Use real delay observations when available
# Fall back to enhanced synthetic data otherwise

# Training parameters:
optimizer = torch.optim.AdamW(model.parameters(), lr=0.001, weight_decay=1e-3)
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=100)
criterion = nn.SmoothL1Loss()  # Huber loss, more robust than MSE

# Train for 100 epochs with early stopping
# Batch size: 64
# Validation: 20% holdout corridors (entire routes held out, not random samples)
```

### 6.5 Variable-Length Graph Handling

Instead of padding/slicing to 8 nodes, use per-sample Laplacians:

```python
# During training and inference, compute Laplacian per-route
# Use the actual route adjacency for that specific train
# Collate batches using padding + mask, or process routes individually
```

### 6.6 Edge Weights from Real Data

Current adjacency: `w = exp(-distance / 100)`. Better:

```python
def build_enhanced_adjacency(route_stops, historical_delay_correlations=None):
    n = len(route_stops)
    adj = np.zeros((n, n))
    for i in range(n):
        adj[i, i] = 1.0
        if i + 1 < n:
            dist = route_stops[i+1].get("section_km", 15)
            # Distance-decay weight
            w_dist = math.exp(-dist / 100.0)
            # If we have historical data: correlation between delays at consecutive stations
            w_corr = historical_delay_correlations.get((i, i+1), 0.5) if historical_delay_correlations else 0.5
            adj[i, i+1] = 0.6 * w_dist + 0.4 * w_corr
            adj[i+1, i] = adj[i, i+1]
    return adj
```

---

## 7. Phase 5: Model C — Stacking Ensemble v2

> **Goal:** Move from simple Ridge blending to a proper stacking meta-learner.

```
File: server/models/ensemble.py
```

### 7.1 Current Problems

- Ridge regression with `positive=True` on just 2 inputs is effectively a constrained weighted average
- Hop-distance adaptive weighting is rule-based (`if hop_dist <= 1: ...`)
- The ensemble was fitted on a Frankenstein target (`0.6 * tabular + 0.4 * graph`)

### 7.2 Improved Stacking Meta-Learner

```python
class StackingEnsembleV2:
    """
    Uses a small LightGBM as meta-learner with additional context features.
    Inputs: lgb_pred, stgcn_pred, abs_diff, hop_distance, time_of_day, 
            train_priority, current_delay, trip_progress.
    Output: final blended delay_delta prediction.
    """
    def __init__(self):
        self.meta_model = lgb.LGBMRegressor(
            n_estimators=100,
            learning_rate=0.05,
            num_leaves=15,
            max_depth=4,
            verbose=-1
        )
    
    def build_meta_features(self, pred_lgb, pred_stgcn, context):
        return np.column_stack([
            pred_lgb,
            pred_stgcn,
            np.abs(pred_lgb - pred_stgcn),  # disagreement signal
            context["hop_distance"],
            context["current_delay_min"],
            context["trip_progress_ratio"],
            context["train_priority"],
            context["is_overnight"],
        ])
    
    def fit(self, y_true, pred_lgb, pred_stgcn, contexts):
        X_meta = self.build_meta_features(pred_lgb, pred_stgcn, contexts)
        self.meta_model.fit(X_meta, y_true)
    
    def predict(self, pred_lgb, pred_stgcn, context):
        X_meta = self.build_meta_features(
            np.array([pred_lgb]),
            np.array([pred_stgcn]),
            {k: np.array([v]) for k, v in context.items()}
        )
        return float(self.meta_model.predict(X_meta)[0])
```

### 7.3 Ensemble Training on Proper OOF Predictions

The meta-learner MUST be trained on out-of-fold (OOF) predictions from Model A and Model B to prevent overfitting:

```python
# 1. Train LightGBM with 5-fold CV, collect OOF point predictions
# 2. Train ST-GCN with held-out corridors, collect OOF predictions
# 3. Train the meta-learner on the OOF predictions aligned with ground truth
# 4. Never train the meta-learner on training-set predictions (leakage!)
```

---

## 8. Phase 6: Model D — Conformal Calibration v2

> **Goal:** Tighter, well-calibrated 90% confidence intervals.

```
File: server/models/conformal_uq.py
```

### 8.1 Current Problems

- Only uses a single `q_hat` margin globally
- Doesn't adapt to context (a train at station 2 vs station 18 has very different uncertainty)
- Interval is uniformly applied: `[q10 - q_hat, q90 + q_hat]`

### 8.2 Conditional CQR (Conformalized Quantile Regression)

```python
class ConditionalCQR:
    """
    Learns separate conformal margins for different operating contexts:
    - By train priority tier
    - By trip progress (early/mid/late journey)
    - By weather severity
    - By delay magnitude
    """
    def __init__(self, coverage=0.90):
        self.coverage = coverage
        self.buckets = {}
    
    def calibrate(self, y_val, q10_val, q90_val, contexts):
        # Bucket by (priority_tier, progress_bin)
        for i in range(len(y_val)):
            priority = int(contexts["train_priority"][i])
            progress = "early" if contexts["trip_progress"][i] < 0.33 else (
                       "mid" if contexts["trip_progress"][i] < 0.66 else "late")
            key = (priority, progress)
            
            score = max(q10_val[i] - y_val[i], y_val[i] - q90_val[i])
            self.buckets.setdefault(key, []).append(score)
        
        self.q_hats = {}
        for key, scores in self.buckets.items():
            n = len(scores)
            p = min(1.0, np.ceil((n + 1) * self.coverage) / n)
            self.q_hats[key] = float(np.quantile(scores, p, method="higher"))
    
    def predict_interval(self, q10, q90, priority, progress):
        key = (priority, "early" if progress < 0.33 else ("mid" if progress < 0.66 else "late"))
        margin = self.q_hats.get(key, max(self.q_hats.values()) if self.q_hats else 2.0)
        return q10 - margin, q90 + margin
```

---

## 9. Phase 7: Recovery Engine v2 — Historical Behavioral Learning

> **Goal:** Replace hardcoded recovery rates with data-driven per-train recovery curves.

```
File: server/models/recovery_engine.py
File: server/ingestion/historical_profiles.py
File: data/historical_train_profiles.json
```

### 9.1 Current Problems

- Recovery rates are hardcoded constants (`0.85`, `0.90`, etc.)
- Only 6 trains have dedicated profiles
- Overnight recovery factors are guesstimates
- Terminal buffer absorption is uniform across all routes
- No per-section recovery learning

### 9.2 Per-Station Recovery Curve Mining

Once real NTES delay observations are collected (Phase 1), build per-train recovery curves:

```python
class DataDrivenRecoveryEngine:
    """
    Mines actual delay recovery patterns from NTES observation history.
    
    For each train, learns:
    1. Section-by-section average delay recovery (delay[i+1] - delay[i])
    2. Recovery rate by time-of-day (overnight vs daytime)
    3. Terminal approach absorption curve (last 3-5 stations)
    4. Station-specific bottleneck probability (junctions that frequently ADD delay)
    5. Seasonal patterns (monsoon vs winter fog vs clear)
    """
    
    @classmethod
    def build_recovery_profile(cls, train_no, observations_df):
        """
        Given a DataFrame of delay_observations for a specific train,
        compute the empirical recovery curve.
        
        Returns dict with:
        - section_recovery: dict of (station_A, station_B) -> avg_delta
        - overnight_recovery_rate: float
        - terminal_absorption: list of (stops_from_end, avg_recovery_min)
        - bottleneck_stations: list of station_codes where delay increases
        - overall_punctuality: float (0-1)
        """
        # Group by run_date, sort by station_seq
        runs = observations_df.groupby("run_date")
        
        section_deltas = defaultdict(list)
        overnight_deltas = []
        terminal_deltas = defaultdict(list)
        
        for run_date, run_df in runs:
            run_sorted = run_df.sort_values("station_seq")
            total_stops = len(run_sorted)
            
            for idx in range(len(run_sorted) - 1):
                curr = run_sorted.iloc[idx]
                next_ = run_sorted.iloc[idx + 1]
                
                delta = next_["delay_min"] - curr["delay_min"]
                section_key = (curr["station_code"], next_["station_code"])
                section_deltas[section_key].append(delta)
                
                # Overnight sections
                if curr.get("is_overnight"):
                    overnight_deltas.append(delta)
                
                # Terminal approach
                stops_from_end = total_stops - 1 - (idx + 1)
                if stops_from_end <= 4:
                    terminal_deltas[stops_from_end].append(delta)
        
        return {
            "section_recovery": {k: np.mean(v) for k, v in section_deltas.items()},
            "overnight_recovery_rate": np.mean(overnight_deltas) if overnight_deltas else 0.0,
            "terminal_absorption": {k: np.mean(v) for k, v in terminal_deltas.items()},
            "bottleneck_stations": [
                k[1] for k, v in section_deltas.items() if np.mean(v) > 2.0
            ],
            "overall_punctuality": ...,
        }
```

### 9.3 Enriched Historical Profiles

Expand `data/historical_train_profiles.json` to include:

```json
{
  "12952": {
    "train_name": "Mumbai Rajdhani Express",
    "route": "NDLS -> BCT",
    "historical_on_time_pct": 92.4,
    "avg_departure_delay_min": 3.2,
    "avg_arrival_delay_min": 1.8,
    "median_recovery_rate": 0.90,
    "per_section_recovery": {
      "NDLS-MTJ": -1.2,
      "MTJ-KOTA": 0.5,
      "KOTA-RTM": -2.8,
      "RTM-BRC": -3.1,
      "BRC-ST": -1.5,
      "ST-BCT": -2.0
    },
    "hourly_recovery_profile": {
      "0-6": -2.5,
      "6-12": 0.8,
      "12-18": 1.2,
      "18-24": -0.5
    },
    "station_bottleneck_probability": {
      "MTJ": 0.35,
      "KOTA": 0.28
    },
    "terminal_absorption_curve": [0.0, -1.5, -3.0, -5.0, -8.0],
    "monsoon_delay_factor": 1.4,
    "fog_season_delay_factor": 2.1,
    "historical_runs_analyzed": 180
  }
}
```

---

## 10. Phase 8: Live NTES Feedback Loop

> **Goal:** Continuously improve model accuracy using live prediction errors.

### 10.1 Prediction Logging

```python
# In routes_eta.py, after every prediction:
log_prediction(
    train_no=t_no,
    timestamp=now_ist,
    current_station=stn_code,
    next_station=nxt_stn_code,
    actual_delay=curr_delay,           # from NTES
    predicted_delta_lgb=pred_delta_lgb,
    predicted_delta_stgcn=pred_delta_stgcn,
    predicted_delta_ensemble=pred_delta,
    forecasted_delay=forecasted_delay,
)
```

### 10.2 Online Error Tracking

```python
# Periodically (every 6 hours), compare predictions with actual outcomes
# Store in a prediction_errors table
# Use to:
# 1. Retune conformal q_hat (adaptive calibration)
# 2. Detect model drift
# 3. Prioritize retraining when MAE exceeds threshold
```

### 10.3 Weekly Retraining Trigger

```python
# server/scripts/retrain_weekly.py
"""
1. Export last 7 days of delay_observations
2. Merge with existing training data
3. Retrain LightGBM with full dataset
4. Retrain ST-GCN with updated graph data
5. Refit ensemble meta-learner
6. Recalibrate CQR
7. Validate on holdout: if MAE improves, swap model artifacts
"""
```

---

## 11. Phase 9: Inference Pipeline Fixes

> **Goal:** Fix how the final ETA is assembled in `routes_eta.py`.

```
File: server/api/routes_eta.py
```

### 11.1 Multi-Hop Forecasting

Currently, for stations beyond `current_stop_idx + 1`, the code calls `stacking_ensemble.predict_delta()` with the same single-step predictions but different `hop_dist`. This is wrong — multi-hop forecasting should recursively predict forward.

**Fix:** Implement autoregressive multi-hop prediction:

```python
running_delay = curr_delay
for hop in range(1, stops_remaining):
    # Build features for the (current_stop + hop) section
    hop_features = build_hop_features(state, weather, hop, running_delay)
    
    # Predict delta for this specific section
    delta_lgb = ml_model.predict(hop_features)["point_delta"]
    delta_stgcn = stgcn_model.predict(route_stops, current_stop_idx + hop, ...)
    delta = ensemble.predict(delta_lgb, delta_stgcn, context)
    
    # Apply recovery engine correction
    recovery_adj = recovery_engine.get_section_recovery(train_no, section_pair, is_overnight)
    
    running_delay = max(0.0, running_delay + delta + recovery_adj)
    route_progress[current_stop_idx + hop].delay_min = running_delay
```

### 11.2 ETA Computation from Delay Forecast

Currently mixes schedule-based and kinematics-based ETA estimates. Simplify:

```python
# For each upcoming station:
eta = scheduled_arrival_time + timedelta(minutes=forecasted_delay_at_that_station)

# The forecasted_delay comes from the autoregressive multi-hop above.
# No need to separately compute kinematic transit time.
```

### 11.3 Recovery Trajectory Integration

Currently `recovery_engine.compute_corridor_recovery_trajectory()` runs independently of the ML models and its output is mixed with ML predictions in a confusing way (`d_min = max(0.0, round(base_rec_delay + (multihop_delta * 0.2), 1))`).

**Fix:** The recovery engine should be ONE of the inputs to the ensemble, not a parallel system whose outputs are manually blended.

```python
# Option A: Recovery adjustment as a post-prediction correction
final_delay = ensemble_prediction + recovery_engine_correction

# Option B: Recovery features fed INTO the ML models (preferred)
# Add section_recovery, terminal_absorption etc. as features
# Let the model learn when and how much to trust recovery patterns
```

---

## 12. Execution Order & Dependencies

```
Phase 1 (Training Data)    --> Must come first
  |-- 1.2 Improved synthetic  --> Immediate (no external dependency)
  |-- 1.1 NTES collection     --> Start now, needs 2+ weeks to accumulate

Phase 2 (Features)          --> After Phase 1.2
Phase 3 (LightGBM tuning)  --> After Phase 2
Phase 4 (ST-GCN rebuild)   --> After Phase 2 (parallel with Phase 3)
Phase 5 (Ensemble v2)      --> After Phase 3 + Phase 4 (needs both OOF preds)
Phase 6 (CQR v2)           --> After Phase 5
Phase 7 (Recovery v2)      --> After Phase 1.1 has data (2+ weeks)
Phase 8 (Feedback loop)    --> After Phase 5 (prediction logging)
Phase 9 (Inference fixes)  --> After Phase 5 + Phase 7
```

### Priority Ranking

| Priority | Phase | Expected Impact on ETA Accuracy | Effort |
|----------|-------|------|--------|
| P0 | Phase 1.2: Fix synthetic data (cap delays, 200 trains, real slack) | **HIGH** — fixes garbage-in-garbage-out | 4-6 hours |
| P0 | Phase 2: Fix broken features (recovery_slack, is_loco_reversal) | **HIGH** — dead features become alive features | 2-3 hours |
| P1 | Phase 3: LightGBM retrain with new features + tuning | **HIGH** — better hyperparameters + features | 3-4 hours |
| P1 | Phase 9.1: Fix multi-hop autoregressive inference | **HIGH** — currently wrong for stations 3+ hops away | 3-4 hours |
| P2 | Phase 4: ST-GCN rebuild | **MEDIUM** — currently contributes ~36% weight but is weak | 6-8 hours |
| P2 | Phase 1.1: Start NTES data collection | **MEDIUM** — long-term foundational, needs time | 3-4 hours to build, 2 weeks to collect |
| P3 | Phase 5: Stacking Ensemble v2 | **MEDIUM** — better blending | 2-3 hours |
| P3 | Phase 6: Conditional CQR | **LOW-MEDIUM** — tighter intervals | 2-3 hours |
| P3 | Phase 7: Data-driven recovery engine | **MEDIUM** — needs Phase 1.1 data | 4-5 hours |
| P4 | Phase 8: Feedback loop | **LOW** — continuous improvement | 3-4 hours |

---

## 13. File Map

Files to **modify**:

| File | Changes |
|------|---------|
| `server/scripts/02_generate_training.py` | Phase 1.2: Fix data generation (200 trains, cap delays, real slack, real weather) |
| `server/features/pipeline.py` | Phase 2: Add 13 new features, fix 3 broken ones |
| `server/models/lightgbm_model.py` | Phase 3: Updated hyperparameters, Huber loss, sample weighting |
| `server/scripts/03_train_model.py` | Phase 3: Cross-validation, OOF predictions |
| `server/models/stgcn_model.py` | Phase 4: RailwaySTGCNv2 architecture, 8 node features |
| `server/scripts/04_train_stgcn.py` | Phase 4: Real training protocol, 100 epochs, variable graphs |
| `server/models/ensemble.py` | Phase 5: LightGBM meta-learner with context features |
| `server/models/conformal_uq.py` | Phase 6: Conditional CQR with bucketed margins |
| `server/models/recovery_engine.py` | Phase 7: Data-driven per-station recovery curves |
| `server/api/routes_eta.py` | Phase 9: Autoregressive multi-hop, clean ETA logic |
| `server/ingestion/historical_profiles.py` | Phase 7: Enhanced profile loading |
| `data/historical_train_profiles.json` | Phase 7: Per-section recovery data |

Files to **create**:

| File | Purpose |
|------|---------|
| `server/scripts/collect_ntes_training_data.py` | Phase 1.1: Live NTES delay observation collector |
| `server/scripts/03a_tune_lightgbm.py` | Phase 3: Optuna hyperparameter search |
| `server/scripts/retrain_weekly.py` | Phase 8: Automated weekly retraining |

---

> **IMPORTANT:** Start with Phase 1.2 + Phase 2 + Phase 3. These three phases alone will deliver the biggest accuracy improvement with the least effort. The current model is fundamentally limited by bad training data and dead features. Fix the foundation first, then improve the architecture.
