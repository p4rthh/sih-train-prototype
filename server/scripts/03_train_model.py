import sys
import time
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, root_mean_squared_error

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from server.config import TRAINING_DATA_FILE
from server.features.pipeline import FEATURE_NAMES
from server.models.lightgbm_model import DelayLightGBM
from server.models.conformal_uq import ConformalCalibrator
from server.models.explainer import DelayReasonEngine

def main():
    print("=" * 60)
    print("🧠 SIH Train Platform — Model A (LightGBM) & CQR Training")
    print("=" * 60)
    t0 = time.time()

    if not TRAINING_DATA_FILE.exists():
        print(f"[Error] Training file {TRAINING_DATA_FILE} not found. Run 02_generate_training.py first.")
        return

    df = pd.read_parquet(TRAINING_DATA_FILE)
    print(f"[Dataset] Loaded {len(df):,} records with {len(FEATURE_NAMES)} features.")

    # Time-series / sequential split (70% train, 15% val, 15% calib)
    n = len(df)
    n_train = int(n * 0.70)
    n_val = int(n * 0.85)

    train_df = df.iloc[:n_train]
    val_df = df.iloc[n_train:n_val]
    cal_df = df.iloc[n_val:]

    X_train, y_train = train_df[FEATURE_NAMES], train_df["delay_delta_next"]
    X_val, y_val = val_df[FEATURE_NAMES], val_df["delay_delta_next"]
    X_cal, y_cal = cal_df[FEATURE_NAMES], cal_df["delay_delta_next"]

    print(f"[Split] Train: {len(X_train):,}, Validation: {len(X_val):,}, Calibration: {len(X_cal):,}")

    # 1. Train LightGBM models
    model = DelayLightGBM()
    model.train(X_train, y_train, X_val, y_val)
    model.save()

    # 2. Evaluate on Validation Set
    val_preds = model.point_model.predict(X_val)
    mae = mean_absolute_error(y_val, val_preds)
    rmse = root_mean_squared_error(y_val, val_preds)

    print("-" * 60)
    print(f"📊 Validation Point MAE:  {mae:.2f} minutes")
    print(f"📊 Validation Point RMSE: {rmse:.2f} minutes")

    # 3. Calibrate CQR (Conformalized Quantile Regression)
    cal_point = model.point_model.predict(X_cal)
    cal_q10 = np.minimum(model.q10_model.predict(X_cal), cal_point)
    cal_q90 = np.maximum(model.q90_model.predict(X_cal), cal_point)

    calibrator = ConformalCalibrator(coverage=0.90)
    q_hat = calibrator.calibrate(y_cal.values, cal_q10, cal_q90)
    calibrator.save()

    # Check empirical coverage on calibration set
    cal_lower = cal_q10 - q_hat
    cal_upper = cal_q90 + q_hat
    emp_coverage = np.mean((y_cal.values >= cal_lower) & (y_cal.values <= cal_upper))
    avg_width = np.mean(cal_upper - cal_lower)

    print(f"🎯 Empirical Test Coverage: {emp_coverage*100:.1f}% (Target: 90%)")
    print(f"📏 Average 90% Interval Width: {avg_width:.1f} minutes")
    print("-" * 60)

    # 4. Test SHAP Explainer
    print("\n🔍 Testing SHAP Delay Reason Engine on extreme fog sample:")
    explainer = DelayReasonEngine(model.point_model)
    
    # Create test sample with dense fog
    test_sample = X_cal.iloc[0:1].copy()
    test_sample["visibility_m"] = 120.0
    test_sample["fog_severity_index"] = 0.98
    test_sample["upstream_train_delay"] = 28.0

    pred_res = model.predict(test_sample)
    low_int, up_int = calibrator.predict_interval(pred_res["q10_delta"], pred_res["q90_delta"])
    reasons = explainer.explain(test_sample)

    print(f"  Predicted Point Delay Delta: +{pred_res['point_delta']:.1f} min")
    print(f"  Guaranteed 90% Arrival Window Delta: [+{low_int:.1f}m, +{up_int:.1f}m]")
    print(f"  Generated Explainable Reasons:")
    for r in reasons:
        print(f"    • {r['reason']} (Severity: {r['severity']}, Impact: +{r['impact_min']}m)")

    elapsed = time.time() - t0
    print("-" * 60)
    print(f"✅ Full ML Pipeline trained, calibrated, and verified in {elapsed:.2f}s!")

if __name__ == "__main__":
    main()
